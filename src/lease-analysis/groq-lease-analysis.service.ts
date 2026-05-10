import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type { LeaseAnalysisSection } from './lease-analysis.mocks';
import {
  LEASE_ANALYSIS_JSON_SCHEMA,
  LEASE_ANALYSIS_SCHEMA_DESCRIPTION,
} from './lease-analysis-json-schemas';
import {
  LEASE_ANALYSIS_SYSTEM_PROMPT,
  SECTION_USER_TAIL,
} from './lease-analysis-section-prompts';
import { writeLeaseAnalysisTraceFile } from './lease-analysis-debug-trace';
import { parseJsonFromLlm } from './json-parse.util';
import {
  CAM_REVIEW_JSON_SCHEMA,
  CAM_REVIEW_SCHEMA_DESCRIPTION,
  CAM_REVIEW_SCHEMA_NAME,
} from './cam-review-json-schema';
import { CAM_REVIEW_USER_TAIL } from './cam-review-prompts';

export interface GroqSectionExtractOptions {
  traceId?: string;
}

/**
 * Groq chat completions — cache-friendly, single-turn per section:
 * - Same system message every call (cached with OCR prefix when prompts align).
 * - User message = OCR text + "---" + short section tail (schema not duplicated in text).
 * - response_format: json_schema + strict for guaranteed shape (GPT-OSS 20B/120B).
 */
@Injectable()
export class GroqLeaseAnalysisService {
  private static readonly GROQ_BACKOFF_MAX_ATTEMPTS = 4;
  private static readonly GROQ_BACKOFF_BASE_MS = 1000;
  private static readonly GROQ_BACKOFF_MAX_MS = 30_000;
  private static readonly GROQ_BACKOFF_JITTER_MS = 250;

  private readonly logger = new Logger(GroqLeaseAnalysisService.name);
  private readonly client: Groq | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('GROQ_API_KEY')?.trim();
    this.client = key ? new Groq({ apiKey: key }) : null;
  }

  /** Call before streaming so we fail fast with 503 instead of mid-stream. */
  ensureConfigured(): void {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot run lease analysis.',
      );
    }
  }

  /**
   * User content: identical OCR prefix across all five calls; only the tail differs.
   * No prior assistant messages — avoids context bloat from earlier sections.
   */
  buildUserContent(ocrPlainText: string, section: LeaseAnalysisSection): string {
    const tail = SECTION_USER_TAIL[section];
    return `${ocrPlainText}\n\n---\n\n${tail}`;
  }

  private jsonSchemaStrictEnabled(): boolean {
    const raw = this.config.get<string>('GROQ_JSON_SCHEMA_STRICT');
    if (raw === undefined || raw === '') return true;
    return raw !== '0' && raw.toLowerCase() !== 'false';
  }

  /**
   * Retries all failures (including 4xx) — Groq sometimes succeeds on a later attempt.
   */
  private async runGroqWithBackoff<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const maxAttempts = GroqLeaseAnalysisService.GROQ_BACKOFF_MAX_ATTEMPTS;
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
          GroqLeaseAnalysisService.GROQ_BACKOFF_MAX_MS,
          GroqLeaseAnalysisService.GROQ_BACKOFF_BASE_MS * 2 ** (attempt - 1),
        );
        const jitter = Math.floor(
          Math.random() * GroqLeaseAnalysisService.GROQ_BACKOFF_JITTER_MS,
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

  async extractSectionJson(
    section: LeaseAnalysisSection,
    ocrPlainText: string,
    options?: GroqSectionExtractOptions,
  ): Promise<unknown> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot run lease analysis.',
      );
    }

    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';

    const strict = this.jsonSchemaStrictEnabled();
    const userContent = this.buildUserContent(ocrPlainText, section);
    const schemaBody = LEASE_ANALYSIS_JSON_SCHEMA[section];
    const traceId = options?.traceId;

    const messages = [
      { role: 'system' as const, content: LEASE_ANALYSIS_SYSTEM_PROMPT }, // cache_control: { type: 'ephemeral' } },
      { role: 'user' as const, content: userContent },
    ];

    if (traceId) {
      const inputPath = await writeLeaseAnalysisTraceFile(
        traceId,
        `${section}-groq-input.json`,
        {
          section,
          model,
          temperature: 0.1,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: `lease_analysis_${section}`,
              description: LEASE_ANALYSIS_SCHEMA_DESCRIPTION[section],
              strict,
              schema: schemaBody,
            },
          },
          messages,
        },
      );
      // eslint-disable-next-line no-console -- explicit operator-visible stage marker
      console.log(
        `[LeaseAnalysis] Groq request | traceId=${traceId} | section=${section} | inputFile=${inputPath ?? '(tracing disabled)'}`,
      );
    }

    const completion = await this.runGroqWithBackoff(
      `chat.completions.create section=${section}`,
      () =>
        this.client!.chat.completions.create({
          model,
          messages,
          temperature: 0.1,
          max_completion_tokens: 10000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: `lease_analysis_${section}`,
              description: LEASE_ANALYSIS_SCHEMA_DESCRIPTION[section],
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
        `Groq section=${section} prompt_tokens=${usage.prompt_tokens} cached_tokens=${usage.prompt_tokens_details.cached_tokens}`,
      );
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new Error(`Groq returned empty content for section ${section}`);
    }

    let parsed: unknown;
    try {
      parsed = parseJsonFromLlm(raw);
    } catch (err) {
      this.logger.error(
        `JSON parse failed for section ${section}: ${raw.slice(0, 800)}`,
      );
      throw err;
    }

    if (traceId) {
      const outPath = await writeLeaseAnalysisTraceFile(
        traceId,
        `${section}-groq-output.json`,
        {
          section,
          model: completion.model ?? model,
          id: completion.id,
          usage: completion.usage,
          rawContent: raw,
          parsed,
        },
      );
      // eslint-disable-next-line no-console -- explicit operator-visible stage marker
      console.log(
        `[LeaseAnalysis] Groq response | traceId=${traceId} | section=${section} | outputFile=${outPath ?? '(tracing disabled)'}`,
      );
    }

    return parsed;
  }

  buildCamReviewUserContent(ocrPlainText: string): string {
    return `${ocrPlainText}\n\n---\n\n${CAM_REVIEW_USER_TAIL}`;
  }

  async extractCamReviewJson(
    ocrPlainText: string,
    options?: GroqSectionExtractOptions,
  ): Promise<unknown> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot run lease analysis.',
      );
    }

    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
    const strict = this.jsonSchemaStrictEnabled();
    const userContent = this.buildCamReviewUserContent(ocrPlainText);
    const traceId = options?.traceId;
    const section = 'camReview' as const;

    const messages = [
      { role: 'system' as const, content: LEASE_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user' as const, content: userContent },
    ];

    if (traceId) {
      const inputPath = await writeLeaseAnalysisTraceFile(
        traceId,
        'camReview-groq-input.json',
        {
          section,
          model,
          temperature: 0.1,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: CAM_REVIEW_SCHEMA_NAME,
              description: CAM_REVIEW_SCHEMA_DESCRIPTION,
              strict,
              schema: CAM_REVIEW_JSON_SCHEMA,
            },
          },
          messages,
        },
      );
      // eslint-disable-next-line no-console -- explicit operator-visible stage marker
      console.log(
        `[LeaseAnalysis] Groq request | traceId=${traceId} | section=camReview | inputFile=${inputPath ?? '(tracing disabled)'}`,
      );
    }

    const completion = await this.runGroqWithBackoff(
      'chat.completions.create section=camReview',
      () =>
        this.client!.chat.completions.create({
          model,
          messages,
          temperature: 0.1,
          max_completion_tokens: 12000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: CAM_REVIEW_SCHEMA_NAME,
              description: CAM_REVIEW_SCHEMA_DESCRIPTION,
              strict,
              schema: CAM_REVIEW_JSON_SCHEMA,
            },
          },
        }),
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new Error('Groq returned empty content for camReview');
    }

    let parsed: unknown;
    try {
      parsed = parseJsonFromLlm(raw);
    } catch (err) {
      this.logger.error(
        `JSON parse failed for camReview: ${raw.slice(0, 800)}`,
      );
      throw err;
    }

    if (traceId) {
      const outPath = await writeLeaseAnalysisTraceFile(
        traceId,
        'camReview-groq-output.json',
        {
          section,
          model: completion.model ?? model,
          id: completion.id,
          usage: completion.usage,
          rawContent: raw,
          parsed,
        },
      );
      // eslint-disable-next-line no-console -- explicit operator-visible stage marker
      console.log(
        `[LeaseAnalysis] Groq response | traceId=${traceId} | section=camReview | outputFile=${outPath ?? '(tracing disabled)'}`,
      );
    }

    return parsed;
  }
}
