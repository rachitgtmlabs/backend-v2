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
import { STREAM_SECTION_ORDER } from '../lease-analysis/lease-analysis.mocks';
import { GroqAmendmentAnalysisService } from './groq-amendment-analysis.service';
import { OcrExtractionBridgeService } from '../lease-analysis/ocr-extraction-bridge.service';

export interface PreviousAnalysis {
  executiveIdentity?: unknown;
  financialStack?: unknown;
  criticalDeadlines?: unknown;
  operationalGuardrails?: unknown;
  legalNuances?: unknown;
  camReview?: unknown;
}

@Injectable()
export class AmendmentAnalysisService {
  private readonly logger = new Logger(AmendmentAnalysisService.name);
  readonly streamOrder = STREAM_SECTION_ORDER;

  constructor(
    private readonly ocr: OcrExtractionBridgeService,
    private readonly groq: GroqAmendmentAnalysisService,
    private readonly gcs: GcsThumbnailService,
  ) {}

  /**
   * Stream amendment analysis as NDJSON, extracting delta from each section.
   * Similar to lease analysis but passes previous version's JSON to extract only changes.
   */
  async streamNdjsonAmendmentAnalysis(
    file: Express.Multer.File,
    previousAnalysis: PreviousAnalysis,
    res: Response,
  ): Promise<void> {
    const buffer = await this.readUploadBuffer(file);

    let ocrText: string;
    try {
      const ocr = await this.ocr.extractTextFromPdfBuffer(buffer);
      ocrText = this.formatOcrTextWithPageMarkers(ocr);
    } catch (err) {
      this.logger.error(err);
      const msg = err instanceof Error ? err.message : 'OCR pipeline failed';
      throw new UnprocessableEntityException(`OCR failed: ${msg}`);
    }

    if (!ocrText) {
      throw new UnprocessableEntityException(
        'No text could be extracted from the PDF.',
      );
    }

    const traceId = `amd_${Date.now()}_${randomUUID().slice(0, 8)}`;
    this.logger.log(
      `OCR text retrieved successfully traceId=${traceId} length=${ocrText.length}`,
    );

    this.groq.ensureConfigured();

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Process each section, extracting delta by comparing against previous version
    for (const section of STREAM_SECTION_ORDER) {
      try {
        const previousSectionJson = previousAnalysis[section] ?? {};
        const data = await this.groq.extractSectionDelta(section, ocrText, {
          previousSectionJson,
        });
        res.write(JSON.stringify({ section, data, isDelta: true }) + '\n');
        (res as any).flush?.();
      } catch (err) {
        this.logger.error(`Groq failed for amendment ${section}`, err);
        const message = err instanceof Error ? err.message : 'LLM request failed';

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

    // Process CAM review delta
    try {
      const previousCamJson = previousAnalysis.camReview ?? {};
      const camData = await this.groq.extractCamReviewDelta(
        ocrText,
        previousCamJson,
      );
      res.write(
        JSON.stringify({ section: 'camReview', data: camData, isDelta: true }) + '\n',
      );
      (res as any).flush?.();
    } catch (err) {
      this.logger.error('Groq failed for amendment camReview', err);
      const message = err instanceof Error ? err.message : 'LLM request failed';
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

    // Upload original PDF to GCS under documents/amendments/
    try {
      const gcsPath = await this.gcs.uploadDocument(
        'amendments',
        buffer,
        file.originalname || file.filename || 'amendment.pdf',
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
