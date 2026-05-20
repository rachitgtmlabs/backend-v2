import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Express } from 'express';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { GcsThumbnailService } from '../property/gcs-thumbnail.service';
import { DraftAddendumDto } from './dto/draft-addendum.dto';
import { ProposedClauseDto } from './dto/proposed-clause.dto';
import { STREAM_SECTION_ORDER } from './lease-analysis.mocks';
import { OPERATIONAL_GUARDRAILS_TOPIC_KEYS } from './lease-analysis-json-schemas';
import { GroqLeaseAnalysisService } from './groq-lease-analysis.service';
import { OcrExtractionBridgeService } from './ocr-extraction-bridge.service';

@Injectable()
export class LeaseAnalysisService {
  private readonly logger = new Logger(LeaseAnalysisService.name);

  readonly streamOrder = STREAM_SECTION_ORDER;

  constructor(
    private readonly ocr: OcrExtractionBridgeService,
    private readonly groq: GroqLeaseAnalysisService,
    private readonly gcs: GcsThumbnailService,
  ) {}

  async proposeComplianceReplacement(
    dto: ProposedClauseDto,
  ): Promise<{ proposedText: string }> {
    this.groq.ensureConfigured();
    const proposedText = await this.groq.proposeComplianceReplacement({
      riskTitle: dto.riskTitle.trim(),
      originalClause: dto.originalClause.trim(),
      jurisdictionSummary: dto.jurisdictionSummary.trim(),
      ...(dto.existingProposedClause?.trim()
        ? { existingProposedClause: dto.existingProposedClause.trim() }
        : {}),
      ...(dto.severity ? { severity: dto.severity } : {}),
    });
    return { proposedText };
  }

  async draftAddendum(dto: DraftAddendumDto): Promise<{ markdown: string }> {
    this.groq.ensureConfigured();
    const markdown = await this.groq.draftAddendumMarkdown({
      riskTitle: dto.riskTitle.trim(),
      originalClause: dto.originalClause.trim(),
      proposedClause: dto.proposedClause.trim(),
      jurisdictionSummary: dto.jurisdictionSummary.trim(),
      ...(dto.severity ? { severity: dto.severity } : {}),
      ...(dto.leaseTitle?.trim() ? { leaseTitle: dto.leaseTitle.trim() } : {}),
      ...(dto.landlordName?.trim()
        ? { landlordName: dto.landlordName.trim() }
        : {}),
      ...(dto.tenantName?.trim() ? { tenantName: dto.tenantName.trim() } : {}),
      ...(dto.effectiveDate?.trim()
        ? { effectiveDate: dto.effectiveDate.trim() }
        : {}),
    });
    return { markdown };
  }

  /**
   * PDF text (PyMuPDF via Python script) → five Groq JSON extractions streamed as NDJSON.
   * Extraction / config errors throw before the response is committed; Groq errors
   * emit a final `{ error, section, message }` line (HTTP status stays 200).
   */
  async streamNdjsonLeaseAnalysis(
    file: Express.Multer.File,
    res: Response,
  ): Promise<void> {
    const buffer = await this.readUploadBuffer(file);

    let ocrText: string;
    try {
      const ocr = await this.ocr.extractTextFromPdfBuffer(buffer);
      ocrText = this.formatOcrTextWithPageMarkers(ocr);
    } catch (err) {
      this.logger.error(err);
      const msg =
        err instanceof Error ? err.message : 'OCR pipeline failed';
      throw new UnprocessableEntityException(`OCR failed: ${msg}`);
    }

    if (!ocrText) {
      throw new UnprocessableEntityException(
        'No text could be extracted from the PDF.',
      );
    }

    const traceId = `${Date.now()}_${randomUUID().slice(0, 8)}`;
    this.logger.log(
      `OCR text retrieved successfully traceId=${traceId} length=${ocrText.length}`,
    );

    // Fail Groq only after OCR succeeded so structured logs still capture OCR stage when the API key is missing.
    this.groq.ensureConfigured();

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.socket?.setNoDelay(true);
    res.write('\n');

    for (const section of STREAM_SECTION_ORDER) {
      try {
        const raw =
          section === 'operationalGuardrails'
            ? await this.groq.extractOperationalGuardrailsJson(ocrText)
            : await this.groq.extractSectionJson(section, ocrText);
        const data =
          section === 'operationalGuardrails'
            ? this.pruneEmptyProvisionTopics(raw)
            : raw;
        res.write(JSON.stringify({ section, data }) + '\n');
        (res as any).flush?.();
      } catch (err) {
        this.logger.error(`Groq failed for ${section}`, err);
        const message =
          err instanceof Error ? err.message : 'LLM request failed';

        res.write(
          JSON.stringify({
            error: 'groq_failed',
            section,
            message,
          }) + '\n',
        );
        (res as any).flush?.();
        res.end();
        return;
      }
    }

    try {
      const camData = await this.groq.extractCamReviewJson(ocrText);
      res.write(
        JSON.stringify({ section: 'camReview', data: camData }) + '\n',
      );
      (res as any).flush?.();
    } catch (err) {
      this.logger.error('Groq failed for camReview', err);
      const message =
        err instanceof Error ? err.message : 'LLM request failed';
      res.write(
        JSON.stringify({
          error: 'groq_failed',
          section: 'camReview',
          message,
        }) + '\n',
      );
      (res as any).flush?.();
      res.end();
      return;
    }

    // Upload original PDF to GCS under documents/leases/
    try {
      const gcsPath = await this.gcs.uploadDocument(
        'leases',
        buffer,
        file.originalname || file.filename || 'lease.pdf',
        file.mimetype || 'application/pdf',
      );
      if (gcsPath) {
        res.write(
          JSON.stringify({ section: 'document_stored', data: { gcs_path: gcsPath } }) + '\n',
        );
      }
    } catch (err) {
      this.logger.warn('GCS document upload failed (non-fatal)', err);
    }

    res.end();
  }

  private formatOcrTextWithPageMarkers(
    ocr: { full_text: string; pages?: Array<{ page_number: number; text: string }> },
  ): string {
    if (ocr.pages && ocr.pages.length > 0) {
      return ocr.pages
        .map((page) => `[PAGE ${page.page_number}]\n${page.text}`)
        .join('\n\n');
    }
    return (ocr.full_text ?? '').trim();
  }

  /**
   * Strip operationalGuardrails topics where the LLM returned only empty
   * strings — these represent clauses the lease genuinely doesn't address.
   * Groq strict mode forces every topic into the response shape; we omit
   * them from the wire payload so the frontend (which filters truthy
   * `data[topic]`) doesn't render empty cards for irrelevant clauses.
   *
   * A topic is "empty" when synopsis.value, keyParameters.value, and
   * narrative.value are all empty strings (whitespace-only counts).
   */
  private pruneEmptyProvisionTopics(raw: unknown): unknown {
    if (!raw || typeof raw !== 'object') return raw;
    const source = raw as Record<string, unknown>;
    const pruned: Record<string, unknown> = {};
    for (const key of OPERATIONAL_GUARDRAILS_TOPIC_KEYS) {
      const topic = source[key];
      if (this.provisionTopicIsEmpty(topic)) continue;
      pruned[key] = topic;
    }
    // Preserve any extra top-level keys the LLM may have added (defensive).
    for (const [key, value] of Object.entries(source)) {
      if ((OPERATIONAL_GUARDRAILS_TOPIC_KEYS as readonly string[]).includes(key))
        continue;
      pruned[key] = value;
    }
    return pruned;
  }

  private provisionTopicIsEmpty(topic: unknown): boolean {
    if (!topic || typeof topic !== 'object') return true;
    const t = topic as Record<string, unknown>;
    const read = (field: unknown): string => {
      if (!field || typeof field !== 'object') return '';
      const v = (field as Record<string, unknown>).value;
      return typeof v === 'string' ? v.trim() : '';
    };
    return (
      read(t.synopsis) === '' &&
      read(t.keyParameters) === '' &&
      read(t.narrative) === ''
    );
  }

  private async readUploadBuffer(file: Express.Multer.File): Promise<Buffer> {
    if (file.buffer?.length) {
      return file.buffer;
    }
    if (file.path) {
      return fs.readFile(file.path);
    }
    throw new BadRequestException('Unable to read uploaded file');
  }
}
