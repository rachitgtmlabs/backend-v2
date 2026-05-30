"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BillsUploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillsUploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const mongoose_2 = require("mongoose");
const ocr_extraction_bridge_service_1 = require("../../lease-analysis/ocr-extraction-bridge.service");
const gcs_thumbnail_service_1 = require("../../property/gcs-thumbnail.service");
const bill_schema_1 = require("../schemas/bill.schema");
const expense_categories_service_1 = require("./expense-categories.service");
const bill_extraction_prompt_1 = require("./bill-extraction.prompt");
const ids_1 = require("../utils/ids");
const ACCEPTED_MIMES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
]);
const MAX_BYTES = 25 * 1024 * 1024;
let BillsUploadService = BillsUploadService_1 = class BillsUploadService {
    constructor(billModel, ocr, gcs, config, categories) {
        this.billModel = billModel;
        this.ocr = ocr;
        this.gcs = gcs;
        this.config = config;
        this.categories = categories;
        this.logger = new common_1.Logger(BillsUploadService_1.name);
        this.groqClient = null;
        const apiKey = config.get('GROQ_API_KEY')?.trim();
        if (apiKey)
            this.groqClient = new groq_sdk_1.default({ apiKey });
    }
    async uploadAndExtract(args) {
        const { portfolio_id, property_id, session_id, file } = args;
        this.validateFile(file);
        const buffer = file.buffer;
        const mime = file.mimetype;
        const isImage = mime.startsWith('image/');
        let sourceUrl = null;
        try {
            sourceUrl = await this.gcs.uploadDocument(`cam-bills/${property_id}`, buffer, file.originalname || 'bill', mime);
        }
        catch (err) {
            this.logger.warn(`GCS upload failed: ${err.message}`);
        }
        const pageTexts = await this.ocrPages(buffer, isImage);
        if (pageTexts.length === 0) {
            return {
                bills: [],
                skipped: { invoice: 0, unknown: 0, failed: 1, total: 1 },
                pages: 1,
            };
        }
        const validCategories = (await this.categories.listForPortfolio(portfolio_id)).map((c) => c.name);
        const settled = await Promise.allSettled(pageTexts.map(async ({ page_number, text }) => {
            if (!text.trim()) {
                return { kind: 'failed', pageNumber: page_number };
            }
            try {
                const extracted = await this.runGroqForPage(text, validCategories, page_number, pageTexts.length);
                if (extracted.classification === 'bill') {
                    return { kind: 'bill', pageNumber: page_number, extracted };
                }
                return {
                    kind: extracted.classification,
                    pageNumber: page_number,
                };
            }
            catch (err) {
                this.logger.warn(`Groq extraction failed on page ${page_number}: ${err.message}`);
                return { kind: 'failed', pageNumber: page_number };
            }
        }));
        const pageResults = settled.map((s) => s.status === 'fulfilled'
            ? s.value
            : { kind: 'failed', pageNumber: -1 });
        const skipped = { invoice: 0, unknown: 0, failed: 0, total: 0 };
        const billDocs = [];
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
            }
            else {
                skipped[result.kind] += 1;
                skipped.total += 1;
            }
        }
        return { bills: billDocs, skipped, pages: pageTexts.length };
    }
    async ocrPages(buffer, isImage) {
        if (isImage) {
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
            const fullText = (ocr?.full_text ?? '').trim();
            return fullText ? [{ page_number: 1, text: fullText }] : [];
        }
        catch (err) {
            this.logger.warn(`OCR failed: ${err.message}`);
            return [];
        }
    }
    async persistBill(args) {
        const { extracted } = args;
        const missingFields = this.detectMissingFields(extracted);
        const status = missingFields.length === 0 ? 'extracted' : 'incomplete';
        const doc = await this.billModel.create({
            billId: (0, ids_1.newBillId)(),
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
    validateFile(file) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('Multipart field "file" with a file is required');
        }
        if (file.size > MAX_BYTES) {
            throw new common_1.BadRequestException('File exceeds 25 MB limit');
        }
        if (!ACCEPTED_MIMES.has(file.mimetype)) {
            throw new common_1.BadRequestException(`Unsupported file type ${file.mimetype}. Accepted: PDF, JPG, PNG.`);
        }
    }
    detectMissingFields(extracted) {
        const missing = [];
        if (!extracted.vendor_name)
            missing.push('vendor_name');
        if (!extracted.invoice_date)
            missing.push('invoice_date');
        if (extracted.total_amount == null)
            missing.push('total_amount');
        if (!extracted.expense_category)
            missing.push('expense_category');
        return missing;
    }
    async runGroqForPage(pageText, validCategories, pageNumber, pageCount) {
        if (!this.groqClient) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const strict = (this.config.get('GROQ_JSON_SCHEMA_STRICT') ?? '').trim() !== 'false';
        const completion = await this.groqClient.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: bill_extraction_prompt_1.BILL_EXTRACTION_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: (0, bill_extraction_prompt_1.buildBillExtractionUserMessage)(pageText, validCategories, pageNumber, pageCount),
                },
            ],
            temperature: 0.1,
            max_completion_tokens: 1500,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'cam_bill_extraction',
                    description: 'Per-page classification (bill/invoice/unknown) plus structured bill fields when classification is "bill".',
                    strict,
                    schema: bill_extraction_prompt_1.BILL_EXTRACTION_JSON_SCHEMA,
                },
            },
        });
        const raw = completion.choices[0]?.message?.content;
        if (!raw?.trim())
            throw new Error('Groq returned empty content');
        const parsed = JSON.parse(raw);
        if (parsed.classification !== 'bill') {
            const nonBill = parsed.classification;
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
};
exports.BillsUploadService = BillsUploadService;
exports.BillsUploadService = BillsUploadService = BillsUploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(bill_schema_1.Bill.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        ocr_extraction_bridge_service_1.OcrExtractionBridgeService,
        gcs_thumbnail_service_1.GcsThumbnailService,
        config_1.ConfigService,
        expense_categories_service_1.ExpenseCategoriesService])
], BillsUploadService);
function parseDate(d) {
    if (!d)
        return null;
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? null : t;
}
function toPayload(doc) {
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
//# sourceMappingURL=bills-upload.service.js.map