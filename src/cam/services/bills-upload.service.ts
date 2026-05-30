import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Express } from 'express';
import Groq from 'groq-sdk';
import { Model } from 'mongoose';

import { OcrExtractionBridgeService } from '../../lease-analysis/ocr-extraction-bridge.service';
import { GcsThumbnailService } from '../../property/gcs-thumbnail.service';
import { Bill, BillDocumentModel, BillStatus } from '../schemas/bill.schema';
import { ExpenseCategoriesService } from './expense-categories.service';
import {
  BILL_EXTRACTION_JSON_SCHEMA,
  BILL_EXTRACTION_SYSTEM_PROMPT,
  BillExtractionResult,
  PageClassification,
  buildBillExtractionUserMessage,
} from './bill-extraction.prompt';
import { newBillId } from '../utils/ids';

const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UploadResult {
  bills: Record<string, unknown>[];
  skipped: {
    invoice: number;
    unknown: number;
    /** Pages where OCR returned no usable text or Groq itself failed. */
    failed: number;
    total: number;
  };
  /** Total pages processed (bills + skipped). */
  pages: number;
}

@Injectable()
export class BillsUploadService {
  private readonly logger = new Logger(BillsUploadService.name);
  private groqClient: Groq | null = null;

  constructor(
    @InjectModel(Bill.name)
    private readonly billModel: Model<BillDocumentModel>,
    private readonly ocr: OcrExtractionBridgeService,
    private readonly gcs: GcsThumbnailService,
    private readonly config: ConfigService,
    private readonly categories: ExpenseCategoriesService,
  ) {
    const apiKey = config.get<string>('GROQ_API_KEY')?.trim();
    if (apiKey) this.groqClient = new Groq({ apiKey });
  }

  /**
   * Multipart upload → GCS storage → OCR (Document AI via Python bridge) →
   * per-page Groq classification + extraction → one Bill row per page that
   * the model classified as a `bill`.
   *
   * Each page of the PDF is treated as a standalone document because vendors
   * often bundle a year's worth of single-page invoices into one PDF. Pages
   * classified as tenant invoices or unclear (`unknown`) are NOT persisted —
   * their counts are returned so the upload card can surface them.
   */
  async uploadAndExtract(args: {
    portfolio_id: string;
    property_id: string;
    session_id?: string;
    file: Express.Multer.File;
  }): Promise<UploadResult> {
    const { portfolio_id, property_id, session_id, file } = args;
    this.validateFile(file);

    const buffer = file.buffer;
    const mime = file.mimetype;
    const isImage = mime.startsWith('image/');

    // 1. Stash the source file in GCS (best-effort; null if not configured).
    let sourceUrl: string | null = null;
    try {
      sourceUrl = await this.gcs.uploadDocument(
        `cam-bills/${property_id}`,
        buffer,
        file.originalname || 'bill',
        mime,
      );
    } catch (err) {
      this.logger.warn(`GCS upload failed: ${(err as Error).message}`);
    }

    // 2. OCR. Images are treated as a single "page 1"; PDFs come back with
    //    one entry per page so we can ask Groq about each page individually.
    const pageTexts = await this.ocrPages(buffer, isImage);
    if (pageTexts.length === 0) {
      // Nothing to extract — surface to the caller so the upload card can
      // show "0 bills, OCR returned no text". No DB row is created.
      return {
        bills: [],
        skipped: { invoice: 0, unknown: 0, failed: 1, total: 1 },
        pages: 1,
      };
    }

    // 3. Per-page Groq classification + extraction, in parallel. Each page
    //    is independent — one failure doesn't block the others.
    const validCategories = (
      await this.categories.listForPortfolio(portfolio_id)
    ).map((c) => c.name);

    type PageResult =
      | { kind: 'bill'; pageNumber: number; extracted: BillExtractionResult }
      | { kind: 'invoice'; pageNumber: number }
      | { kind: 'unknown'; pageNumber: number }
      | { kind: 'failed'; pageNumber: number };

    const settled = await Promise.allSettled(
      pageTexts.map(async ({ page_number, text }): Promise<PageResult> => {
        if (!text.trim()) {
          return { kind: 'failed', pageNumber: page_number };
        }
        try {
          const extracted = await this.runGroqForPage(
            text,
            validCategories,
            page_number,
            pageTexts.length,
          );
          if (extracted.classification === 'bill') {
            return { kind: 'bill', pageNumber: page_number, extracted };
          }
          return {
            kind: extracted.classification,
            pageNumber: page_number,
          };
        } catch (err) {
          this.logger.warn(
            `Groq extraction failed on page ${page_number}: ${(err as Error).message}`,
          );
          return { kind: 'failed', pageNumber: page_number };
        }
      }),
    );

    const pageResults: PageResult[] = settled.map((s) =>
      s.status === 'fulfilled'
        ? s.value
        : ({ kind: 'failed', pageNumber: -1 } satisfies PageResult),
    );

    // 4. Persist one Bill row per bill-classified page.
    const skipped = { invoice: 0, unknown: 0, failed: 0, total: 0 };
    const billDocs: Record<string, unknown>[] = [];

    for (const result of pageResults) {
      if (result.kind === 'bill') {
        const billDoc = await this.persistBill({
          portfolio_id,
          property_id,
          session_id: session_id ?? null,
          source_url: sourceUrl,
          page_number: result.pageNumber,
          extracted: result.extracted,
        });
        billDocs.push(billDoc);
      } else {
        skipped[result.kind] += 1;
        skipped.total += 1;
      }
    }

    return { bills: billDocs, skipped, pages: pageTexts.length };
  }

  private async ocrPages(
    buffer: Buffer,
    isImage: boolean,
  ): Promise<Array<{ page_number: number; text: string }>> {
    if (isImage) {
      // The Python bridge only handles PDFs; for images we yield a single
      // empty page so the caller's "failed" branch fires and a UI message
      // tells the user to upload as PDF for now.
      return [];
    }
    try {
      const ocr = await this.ocr.extractTextFromPdfBuffer(buffer);
      if (Array.isArray(ocr?.pages) && ocr.pages.length > 0) {
        return ocr.pages.map((p) => ({
          page_number: p.page_number,
          text: (p.text ?? '').trim(),
        }));
      }
      // Fallback: OCR didn't break down by page — treat the whole blob as
      // page 1 so we at least try to extract one bill.
      const fullText = (ocr?.full_text ?? '').trim();
      return fullText ? [{ page_number: 1, text: fullText }] : [];
    } catch (err) {
      this.logger.warn(`OCR failed: ${(err as Error).message}`);
      return [];
    }
  }

  private async persistBill(args: {
    portfolio_id: string;
    property_id: string;
    session_id: string | null;
    source_url: string | null;
    page_number: number;
    extracted: BillExtractionResult;
  }): Promise<Record<string, unknown>> {
    const { extracted } = args;
    const missingFields = this.detectMissingFields(extracted);
    const status: BillStatus =
      missingFields.length === 0 ? 'extracted' : 'incomplete';

    const doc = await this.billModel.create({
      billId: newBillId(),
      portfolio_id: args.portfolio_id,
      property_id: args.property_id,
      unit_id: null,
      vendor_invoice_number: extracted.vendor_invoice_number,
      vendor_name: extracted.vendor_name,
      vendor_id: null,
      invoice_date: parseDate(extracted.invoice_date),
      due_date: parseDate(extracted.due_date),
      service_period_start: parseDate(extracted.service_period_start),
      service_period_end: parseDate(extracted.service_period_end),
      total_amount: extracted.total_amount,
      currency: extracted.currency || 'USD',
      expense_category: extracted.expense_category,
      status,
      source_file_url: args.source_url,
      source_page_range: String(args.page_number),
      ocr_confidence: extracted.confidence,
      missing_fields: missingFields,
      additional_meta_data: {
        classification_reason: extracted.classification_reason,
        ...(extracted.notes ? { notes: extracted.notes } : {}),
      },
      session_id: args.session_id,
      created_by: null,
      accepted_by: null,
      accepted_at: null,
    });
    return toPayload(doc.toObject());
  }

  private validateFile(file: Express.Multer.File | undefined) {
    if (!file?.buffer) {
      throw new BadRequestException('Multipart field "file" with a file is required');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File exceeds 25 MB limit');
    }
    if (!ACCEPTED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type ${file.mimetype}. Accepted: PDF, JPG, PNG.`,
      );
    }
  }

  private detectMissingFields(extracted: BillExtractionResult): string[] {
    const missing: string[] = [];
    if (!extracted.vendor_name) missing.push('vendor_name');
    if (!extracted.invoice_date) missing.push('invoice_date');
    if (extracted.total_amount == null) missing.push('total_amount');
    if (!extracted.expense_category) missing.push('expense_category');
    return missing;
  }

  private async runGroqForPage(
    pageText: string,
    validCategories: string[],
    pageNumber: number,
    pageCount: number,
  ): Promise<BillExtractionResult> {
    if (!this.groqClient) {
      throw new ServiceUnavailableException('GROQ_API_KEY is not configured');
    }
    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
    const strict =
      (this.config.get<string>('GROQ_JSON_SCHEMA_STRICT') ?? '').trim() !== 'false';

    const completion = await this.groqClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: BILL_EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildBillExtractionUserMessage(
            pageText,
            validCategories,
            pageNumber,
            pageCount,
          ),
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 1500,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'cam_bill_extraction',
          description:
            'Per-page classification (bill/invoice/unknown) plus structured bill fields when classification is "bill".',
          strict,
          schema: BILL_EXTRACTION_JSON_SCHEMA,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) throw new Error('Groq returned empty content');
    const parsed = JSON.parse(raw) as BillExtractionResult;

    // Defensive: if the model returned a non-bill classification but still
    // filled fields, null them out so we don't accidentally persist them.
    if (parsed.classification !== 'bill') {
      const nonBill: PageClassification = parsed.classification;
      return {
        classification: nonBill,
        classification_reason: parsed.classification_reason ?? '',
        vendor_name: null,
        vendor_invoice_number: null,
        invoice_date: null,
        due_date: null,
        service_period_start: null,
        service_period_end: null,
        total_amount: null,
        currency: null,
        expense_category: null,
        confidence: parsed.confidence,
        notes: parsed.notes,
      };
    }
    return parsed;
  }
}

function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t;
}

function toPayload(doc: Record<string, any>) {
  return {
    billId: doc.billId,
    portfolio_id: doc.portfolio_id,
    property_id: doc.property_id,
    unit_id: doc.unit_id,
    vendor_invoice_number: doc.vendor_invoice_number,
    vendor_name: doc.vendor_name,
    vendor_id: doc.vendor_id,
    invoice_date: doc.invoice_date,
    due_date: doc.due_date,
    service_period_start: doc.service_period_start,
    service_period_end: doc.service_period_end,
    total_amount: doc.total_amount,
    currency: doc.currency,
    expense_category: doc.expense_category,
    status: doc.status,
    source_file_url: doc.source_file_url,
    source_page_range: doc.source_page_range,
    ocr_confidence: doc.ocr_confidence,
    missing_fields: doc.missing_fields,
    additional_meta_data: doc.additional_meta_data,
    session_id: doc.session_id,
    created_by: doc.created_by,
    accepted_by: doc.accepted_by,
    accepted_at: doc.accepted_at,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
