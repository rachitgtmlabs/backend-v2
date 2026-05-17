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
import { parseJsonFromLlm } from './json-parse.util';
import {
  CAM_REVIEW_JSON_SCHEMA,
  CAM_REVIEW_SCHEMA_DESCRIPTION,
  CAM_REVIEW_SCHEMA_NAME,
} from './cam-review-json-schema';
import { CAM_REVIEW_USER_TAIL } from './cam-review-prompts';

export interface ProposeComplianceReplacementInput {
  riskTitle: string;
  originalClause: string;
  jurisdictionSummary: string;
  existingProposedClause?: string;
  severity?: string;
}

export interface DraftAddendumInput {
  riskTitle: string;
  originalClause: string;
  proposedClause: string;
  jurisdictionSummary: string;
  severity?: string;
  leaseTitle?: string;
  landlordName?: string;
  tenantName?: string;
  effectiveDate?: string;
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

    const messages = [
      { role: 'system' as const, content: LEASE_ANALYSIS_SYSTEM_PROMPT }, // cache_control: { type: 'ephemeral' } },
      { role: 'user' as const, content: userContent },
    ];

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

    return parsed;
  }

  buildCamReviewUserContent(ocrPlainText: string): string {
    return `${ocrPlainText}\n\n---\n\n${CAM_REVIEW_USER_TAIL}`;
  }

  async extractCamReviewJson(ocrPlainText: string): Promise<unknown> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot run lease analysis.',
      );
    }

    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
    const strict = this.jsonSchemaStrictEnabled();
    const userContent = this.buildCamReviewUserContent(ocrPlainText);
    const section = 'camReview' as const;

    const messages = [
      { role: 'system' as const, content: LEASE_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user' as const, content: userContent },
    ];

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

    return parsed;
  }

  /** Single-turn prose: compliant replacement wording for Resolve Risk UX. */
  async proposeComplianceReplacement(
    input: ProposeComplianceReplacementInput,
  ): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot propose clause wording.',
      );
    }

    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';

    const chunks: string[] = [
      `Risk topic: ${input.riskTitle}`,
      `Severity: ${input.severity ?? 'unspecified'}`,
      `Jurisdiction summary: ${input.jurisdictionSummary}`,
      `Lease provision to replace:\n"""${input.originalClause}"""`,
    ];
    const draft = input.existingProposedClause?.trim();
    if (draft) {
      chunks.push(
        `Optional starting suggestion (rewrite or supersede):\n"""${draft}"""`,
      );
    }
    chunks.push(
      'Write ONLY replacement lease/amendment language that could substitute for the cited provision. Be concise, professional, jurisdiction-aware where indicated. ',
      'Do not paste the objectionable clause back as the solution.',
      'End with one sentence that counsel must review before execution.',
    );

    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a senior commercial real estate paralegal drafting neutral, legally conservative replacement language.',
      },
      {
        role: 'user' as const,
        content: chunks.join('\n\n'),
      },
    ];

    const completion = await this.runGroqWithBackoff(
      'chat.completions.create proposed-clause',
      () =>
        this.client!.chat.completions.create({
          model,
          messages,
          temperature: 0.15,
          max_completion_tokens: 900,
        }),
    );

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error('Groq returned empty proposed clause text');
    }
    return raw;
  }

  /** Markdown amendment draft for the Draft Addendum review screen. */
  async draftAddendumMarkdown(input: DraftAddendumInput): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured; cannot draft addendum.',
      );
    }

    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';

    const landlord = input.landlordName?.trim() || '[Landlord Name]';
    const tenant = input.tenantName?.trim() || '[Tenant Name]';
    const leaseTitle = input.leaseTitle?.trim() || 'the Lease Agreement';
    const effectiveDate = input.effectiveDate?.trim() || '[Effective Date]';

    const userBlocks: string[] = [
      `Risk topic: ${input.riskTitle}`,
      `Severity: ${input.severity ?? 'unspecified'}`,
      `Jurisdiction summary: ${input.jurisdictionSummary}`,
      `Original lease clause to strike:\n"""${input.originalClause}"""`,
      `Compliant replacement language to insert:\n"""${input.proposedClause}"""`,
      `Lease reference: ${leaseTitle}`,
      `Landlord: ${landlord}`,
      `Tenant: ${tenant}`,
      `Effective date: ${effectiveDate}`,
      [
        'Draft a one-page formal Lease Amendment in **GitHub-flavored Markdown only** — no preamble, no code fences, no explanation outside the document.',
        '',
        'Structure:',
        '1. Title heading: "# Amendment to Lease Agreement"',
        '2. Recital block with effective date, landlord, tenant, and the underlying lease reference.',
        '3. "## Recitals" with one or two short WHEREAS clauses naming the risk being cured and the jurisdictional reason.',
        '4. "## 1. Amendment" section that:',
        '   - Quotes the struck clause as a Markdown blockquote prefixed with **Struck:**',
        '   - Quotes the replacement clause as a Markdown blockquote prefixed with **Replaced with:**',
        '5. "## 2. Ratification" — short paragraph confirming all other lease terms remain in full force.',
        '6. "## 3. Counterparts & Execution" — one short paragraph allowing electronic / counterpart execution.',
        '7. "## Signatures" with two signature blocks (Landlord, Tenant) using plain Markdown — name line, signature line as "______________________", and date line.',
        '8. Final italic disclaimer line stating counsel should review before execution.',
        '',
        'Keep tone neutral, professional, and concise. Do not invent facts beyond what is provided. Output Markdown only.',
      ].join('\n'),
    ];

    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a senior commercial real estate paralegal. You produce clean, conservative, well-structured lease amendment drafts in Markdown for attorney review.',
      },
      {
        role: 'user' as const,
        content: userBlocks.join('\n\n'),
      },
    ];

    const completion = await this.runGroqWithBackoff(
      'chat.completions.create draft-addendum',
      () =>
        this.client!.chat.completions.create({
          model,
          messages,
          temperature: 0.2,
          max_completion_tokens: 1800,
        }),
    );

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error('Groq returned empty addendum markdown');
    }
    return stripCodeFences(raw);
  }
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i;
  const m = trimmed.match(fence);
  return m ? m[1].trim() : trimmed;
}
