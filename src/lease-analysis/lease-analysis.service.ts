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
import { DraftAddendumDto } from './dto/draft-addendum.dto';
import { ProposedClauseDto } from './dto/proposed-clause.dto';
import { STREAM_SECTION_ORDER } from './lease-analysis.mocks';
import { GroqLeaseAnalysisService } from './groq-lease-analysis.service';
import { OcrExtractionBridgeService } from './ocr-extraction-bridge.service';

@Injectable()
export class LeaseAnalysisService {
  private readonly logger = new Logger(LeaseAnalysisService.name);

  readonly streamOrder = STREAM_SECTION_ORDER;

  constructor(
    private readonly ocr: OcrExtractionBridgeService,
    private readonly groq: GroqLeaseAnalysisService,
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
    // eslint-disable-next-line no-console -- explicit operator-visible stage marker
    console.log(
      `[LeaseAnalysis] OCR stage complete | traceId=${traceId} | chars=${ocrText.length} | preview=${JSON.stringify(ocrText.slice(0, 120))}${ocrText.length > 120 ? '…' : ''}`,
    );
    this.logger.log(
      `OCR text retrieved successfully traceId=${traceId} length=${ocrText.length}`,
    );

    // Fail Groq only after OCR succeeded so logs/traces show OCR stage even when API key is missing.
    this.groq.ensureConfigured();

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    for (const section of STREAM_SECTION_ORDER) {
      try {
        const data = await this.groq.extractSectionJson(section, ocrText, {
          traceId,
        });
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
      const camData = await this.groq.extractCamReviewJson(ocrText, {
        traceId,
      });
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
