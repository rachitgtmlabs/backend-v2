"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AmendmentAnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmendmentAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const fs = __importStar(require("node:fs/promises"));
const gcs_thumbnail_service_1 = require("../property/gcs-thumbnail.service");
const lease_analysis_mocks_1 = require("../lease-analysis/lease-analysis.mocks");
const lease_analysis_json_schemas_1 = require("../lease-analysis/lease-analysis-json-schemas");
const groq_amendment_analysis_service_1 = require("./groq-amendment-analysis.service");
const ocr_extraction_bridge_service_1 = require("../lease-analysis/ocr-extraction-bridge.service");
let AmendmentAnalysisService = AmendmentAnalysisService_1 = class AmendmentAnalysisService {
    constructor(ocr, groq, gcs) {
        this.ocr = ocr;
        this.groq = groq;
        this.gcs = gcs;
        this.logger = new common_1.Logger(AmendmentAnalysisService_1.name);
        this.streamOrder = lease_analysis_mocks_1.STREAM_SECTION_ORDER;
    }
    async streamNdjsonAmendmentAnalysis(file, previousAnalysis, res) {
        const buffer = await this.readUploadBuffer(file);
        let ocrText;
        try {
            const ocr = await this.ocr.extractTextFromPdfBuffer(buffer);
            ocrText = this.formatOcrTextWithPageMarkers(ocr);
        }
        catch (err) {
            this.logger.error(err);
            const msg = err instanceof Error ? err.message : 'OCR pipeline failed';
            throw new common_1.UnprocessableEntityException(`OCR failed: ${msg}`);
        }
        if (!ocrText) {
            throw new common_1.UnprocessableEntityException('No text could be extracted from the PDF.');
        }
        const traceId = `amd_${Date.now()}_${(0, node_crypto_1.randomUUID)().slice(0, 8)}`;
        this.logger.log(`OCR text retrieved successfully traceId=${traceId} length=${ocrText.length}`);
        this.groq.ensureConfigured();
        res.status(200);
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        res.socket?.setNoDelay(true);
        res.write('\n');
        for (const section of lease_analysis_mocks_1.STREAM_SECTION_ORDER) {
            try {
                const previousSectionJson = previousAnalysis[section] ?? {};
                const raw = section === 'operationalGuardrails'
                    ? await this.groq.extractOperationalGuardrailsDelta(ocrText, previousSectionJson)
                    : await this.groq.extractSectionDelta(section, ocrText, {
                        previousSectionJson,
                    });
                const data = section === 'operationalGuardrails'
                    ? this.pruneEmptyProvisionTopics(raw)
                    : raw;
                res.write(JSON.stringify({ section, data, isDelta: true }) + '\n');
                res.flush?.();
            }
            catch (err) {
                this.logger.error(`Groq failed for amendment ${section}`, err);
                const message = err instanceof Error ? err.message : 'LLM request failed';
                res.write(JSON.stringify({
                    error: 'groq_failed',
                    section,
                    message,
                }) + '\n');
                res.flush?.();
                res.end();
                return;
            }
        }
        try {
            const previousCamJson = previousAnalysis.camReview ?? {};
            const camData = await this.groq.extractCamReviewDelta(ocrText, previousCamJson);
            res.write(JSON.stringify({ section: 'camReview', data: camData, isDelta: true }) + '\n');
            res.flush?.();
        }
        catch (err) {
            this.logger.error('Groq failed for amendment camReview', err);
            const message = err instanceof Error ? err.message : 'LLM request failed';
            res.write(JSON.stringify({
                error: 'groq_failed',
                section: 'camReview',
                message,
            }) + '\n');
            res.flush?.();
            res.end();
            return;
        }
        try {
            const gcsPath = await this.gcs.uploadDocument('amendments', buffer, file.originalname || file.filename || 'amendment.pdf', file.mimetype || 'application/pdf');
            if (gcsPath) {
                res.write(JSON.stringify({ section: 'document_stored', data: { gcs_path: gcsPath } }) + '\n');
            }
        }
        catch (err) {
            this.logger.warn('GCS document upload failed (non-fatal)', err);
        }
        res.end();
    }
    formatOcrTextWithPageMarkers(ocr) {
        if (ocr.pages && ocr.pages.length > 0) {
            return ocr.pages
                .map((page) => `[PAGE ${page.page_number}]\n${page.text}`)
                .join('\n\n');
        }
        return (ocr.full_text ?? '').trim();
    }
    async readUploadBuffer(file) {
        if (file.buffer?.length) {
            return file.buffer;
        }
        if (file.path) {
            return fs.readFile(file.path);
        }
        throw new common_1.BadRequestException('Unable to read uploaded file');
    }
    pruneEmptyProvisionTopics(raw) {
        if (!raw || typeof raw !== 'object')
            return raw;
        const source = raw;
        const pruned = {};
        for (const key of lease_analysis_json_schemas_1.OPERATIONAL_GUARDRAILS_TOPIC_KEYS) {
            const topic = source[key];
            if (this.provisionTopicIsEmpty(topic))
                continue;
            pruned[key] = topic;
        }
        for (const [key, value] of Object.entries(source)) {
            if (lease_analysis_json_schemas_1.OPERATIONAL_GUARDRAILS_TOPIC_KEYS.includes(key))
                continue;
            pruned[key] = value;
        }
        return pruned;
    }
    provisionTopicIsEmpty(topic) {
        if (!topic || typeof topic !== 'object')
            return true;
        const t = topic;
        const read = (field) => {
            if (!field || typeof field !== 'object')
                return '';
            const v = field.value;
            return typeof v === 'string' ? v.trim() : '';
        };
        return (read(t.synopsis) === '' &&
            read(t.keyParameters) === '' &&
            read(t.narrative) === '');
    }
};
exports.AmendmentAnalysisService = AmendmentAnalysisService;
exports.AmendmentAnalysisService = AmendmentAnalysisService = AmendmentAnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ocr_extraction_bridge_service_1.OcrExtractionBridgeService,
        groq_amendment_analysis_service_1.GroqAmendmentAnalysisService,
        gcs_thumbnail_service_1.GcsThumbnailService])
], AmendmentAnalysisService);
//# sourceMappingURL=amendment-analysis.service.js.map