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
    // eslint-disable-next-line no-console
    console.log(
      `[AmendmentAnalysis] OCR stage complete | traceId=${traceId} | chars=${ocrText.length} | preview=${JSON.stringify(ocrText.slice(0, 120))}${ocrText.length > 120 ? '…' : ''}`,
    );
    this.logger.log(
      `OCR text retrieved successfully traceId=${traceId} length=${ocrText.length}`,
    );

    this.groq.ensureConfigured();

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders?.();

    // Process each section, extracting delta by comparing against previous version
    for (const section of STREAM_SECTION_ORDER) {
      try {
        const previousSectionJson = previousAnalysis[section] ?? {};
        const data = await this.groq.extractSectionDelta(section, ocrText, {
          traceId,
          previousSectionJson,
        });
        res.write(JSON.stringify({ section, data, isDelta: true }) + '\n');
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
        res.end();
        return;
      }
    }

    // Process CAM review delta
    try {
      const previousCamJson = previousAnalysis.camReview ?? {};
      const camData = await this.groq.extractCamReviewDelta(ocrText, previousCamJson, {
        traceId,
      });
      res.write(
        JSON.stringify({ section: 'camReview', data: camData, isDelta: true }) + '\n',
      );
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
