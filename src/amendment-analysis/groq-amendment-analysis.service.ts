import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type { LeaseAnalysisSection } from '../lease-analysis/lease-analysis.mocks';
import {
  LEASE_ANALYSIS_JSON_SCHEMA,
  LEASE_ANALYSIS_SCHEMA_DESCRIPTION,
} from '../lease-analysis/lease-analysis-json-schemas';
import {
  CAM_REVIEW_JSON_SCHEMA,
  CAM_REVIEW_SCHEMA_DESCRIPTION,
  CAM_REVIEW_SCHEMA_NAME,
} from '../lease-analysis/cam-review-json-schema';
import {
  AMENDMENT_ANALYSIS_SYSTEM_PROMPT,
  buildAmendmentUserContent,
  buildAmendmentCamReviewUserContent,
} from './amendment-analysis-prompts';
import { writeLeaseAnalysisTraceFile } from '../lease-analysis/lease-analysis-debug-trace';
import { parseJsonFromLlm } from '../lease-analysis/json-parse.util';

export interface AmendmentSectionExtractOptions {
  traceId?: string;
  previousSectionJson: unknown;
}

/**
 * Groq-based amendment analysis service.
 * Similar to GroqLeaseAnalysisService but extracts DELTA only by passing
 * previous version's JSON in the prompt.
 */
@Injectable()
export class GroqAmendmentAnalysisService {
  private static readonly GROQ_BACKOFF_MAX_ATTEMPTS = 4;
  private static readonly GROQ_BACKOFF_BASE_MS = 1000;
  private static readonly GROQ_BACKOFF_MAX_MS = 30_000;
  private static readonly GROQ_BACKOFF_JITTER_MS = 250;

  private readonly logger = new Logger(GroqAmendmentAnalysisService.name);
  private readonly client: Groq | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('GROQ_API_KEY')?.trim();
    this.client = key ? new Groq({ apiKey: key }) : null;
  }

  ensureConfigured(): void {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot run amendment analysis.',
      );
    }
  }

  private jsonSchemaStrictEnabled(): boolean {
    const raw = this.config.get<string>('GROQ_JSON_SCHEMA_STRICT');
    if (raw === undefined || raw === '') return true;
    return raw !== '0' && raw.toLowerCase() !== 'false';
  }

  private async runGroqWithBackoff<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const maxAttempts = GroqAmendmentAnalysisService.GROQ_BACKOFF_MAX_ATTEMPTS;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt === maxAttempts) {
          break;
        }
        const exp = Math.min(
          GroqAmendmentAnalysisService.GROQ_BACKOFF_MAX_MS,
          GroqAmendmentAnalysisService.GROQ_BACKOFF_BASE_MS * 2 ** (attempt - 1),
        );
        const jitter = Math.floor(
          Math.random() * GroqAmendmentAnalysisService.GROQ_BACKOFF_JITTER_MS,
        );
        const waitMs = exp + jitter;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Groq ${label} failed (attempt ${attempt}/${maxAttempts}): ${msg}; retrying in ${waitMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    throw lastError;
  }

  /**
   * Extract delta for a specific section by comparing amendment against previous version.
   */
  async extractSectionDelta(
    section: LeaseAnalysisSection,
    ocrPlainText: string,
    options: AmendmentSectionExtractOptions,
  ): Promise<unknown> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot run amendment analysis.',
      );
    }

    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
    const strict = this.jsonSchemaStrictEnabled();
    const userContent = buildAmendmentUserContent(
      ocrPlainText,
      section,
      options.previousSectionJson,
    );
    const schemaBody = LEASE_ANALYSIS_JSON_SCHEMA[section];
    const traceId = options?.traceId;

    const messages = [
      { role: 'system' as const, content: AMENDMENT_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user' as const, content: userContent },
    ];

    if (traceId) {
      const inputPath = await writeLeaseAnalysisTraceFile(
        traceId,
        `amendment-${section}-groq-input.json`,
        {
          section,
          model,
          temperature: 0.1,
          previousSectionJson: options.previousSectionJson,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: `amendment_analysis_${section}`,
              description: `Delta extraction for ${LEASE_ANALYSIS_SCHEMA_DESCRIPTION[section]}`,
              strict,
              schema: schemaBody,
            },
          },
          messages,
        },
      );
      // eslint-disable-next-line no-console
      console.log(
        `[AmendmentAnalysis] Groq request | traceId=${traceId} | section=${section} | inputFile=${inputPath ?? '(tracing disabled)'}`,
      );
    }

    const completion = await this.runGroqWithBackoff(
      `chat.completions.create amendment-section=${section}`,
      () =>
        this.client!.chat.completions.create({
          model,
          messages,
          temperature: 0.1,
          max_completion_tokens: 10000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: `amendment_analysis_${section}`,
              description: `Delta extraction for ${LEASE_ANALYSIS_SCHEMA_DESCRIPTION[section]}`,
              strict,
              schema: schemaBody,
            },
          },
        }),
    );

    const usage = completion.usage as
      | {
          prompt_tokens?: number;
          completion_tokens?: number;
          prompt_tokens_details?: { cached_tokens?: number };
        }
      | undefined;

    if (usage?.prompt_tokens_details?.cached_tokens != null) {
      this.logger.debug(
        `Groq amendment section=${section} prompt_tokens=${usage.prompt_tokens} cached_tokens=${usage.prompt_tokens_details.cached_tokens}`,
      );
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new Error(`Groq returned empty content for amendment section ${section}`);
    }

    let parsed: unknown;
    try {
      parsed = parseJsonFromLlm(raw);
    } catch (err) {
      this.logger.error(
        `JSON parse failed for amendment section ${section}: ${raw.slice(0, 800)}`,
      );
      throw err;
    }

    if (traceId) {
      const outPath = await writeLeaseAnalysisTraceFile(
        traceId,
        `amendment-${section}-groq-output.json`,
        {
          section,
          model: completion.model ?? model,
          id: completion.id,
          usage: completion.usage,
          rawContent: raw,
          parsed,
        },
      );
      // eslint-disable-next-line no-console
      console.log(
        `[AmendmentAnalysis] Groq response | traceId=${traceId} | section=${section} | outputFile=${outPath ?? '(tracing disabled)'}`,
      );
    }

    return parsed;
  }

  /**
   * Extract CAM review delta
   */
  async extractCamReviewDelta(
    ocrPlainText: string,
    previousCamJson: unknown,
    options?: { traceId?: string },
  ): Promise<unknown> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot run amendment analysis.',
      );
    }

    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
    const strict = this.jsonSchemaStrictEnabled();
    const userContent = buildAmendmentCamReviewUserContent(ocrPlainText, previousCamJson);
    const traceId = options?.traceId;
    const section = 'camReview' as const;

    const messages = [
      { role: 'system' as const, content: AMENDMENT_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user' as const, content: userContent },
    ];

    if (traceId) {
      const inputPath = await writeLeaseAnalysisTraceFile(
        traceId,
        'amendment-camReview-groq-input.json',
        {
          section,
          model,
          temperature: 0.1,
          previousCamJson,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: `amendment_${CAM_REVIEW_SCHEMA_NAME}`,
              description: `Delta extraction for ${CAM_REVIEW_SCHEMA_DESCRIPTION}`,
              strict,
              schema: CAM_REVIEW_JSON_SCHEMA,
            },
          },
          messages,
        },
      );
      // eslint-disable-next-line no-console
      console.log(
        `[AmendmentAnalysis] Groq request | traceId=${traceId} | section=camReview | inputFile=${inputPath ?? '(tracing disabled)'}`,
      );
    }

    const completion = await this.runGroqWithBackoff(
      'chat.completions.create amendment-section=camReview',
      () =>
        this.client!.chat.completions.create({
          model,
          messages,
          temperature: 0.1,
          max_completion_tokens: 12000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: `amendment_${CAM_REVIEW_SCHEMA_NAME}`,
              description: `Delta extraction for ${CAM_REVIEW_SCHEMA_DESCRIPTION}`,
              strict,
              schema: CAM_REVIEW_JSON_SCHEMA,
            },
          },
        }),
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new Error('Groq returned empty content for amendment camReview');
    }

    let parsed: unknown;
    try {
      parsed = parseJsonFromLlm(raw);
    } catch (err) {
      this.logger.error(
        `JSON parse failed for amendment camReview: ${raw.slice(0, 800)}`,
      );
      throw err;
    }

    if (traceId) {
      const outPath = await writeLeaseAnalysisTraceFile(
        traceId,
        'amendment-camReview-groq-output.json',
        {
          section,
          model: completion.model ?? model,
          id: completion.id,
          usage: completion.usage,
          rawContent: raw,
          parsed,
        },
      );
      // eslint-disable-next-line no-console
      console.log(
        `[AmendmentAnalysis] Groq response | traceId=${traceId} | section=camReview | outputFile=${outPath ?? '(tracing disabled)'}`,
      );
    }

    return parsed;
  }
}
