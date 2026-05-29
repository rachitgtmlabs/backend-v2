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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var GroqAmendmentAnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqAmendmentAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const lease_analysis_json_schemas_1 = require("../lease-analysis/lease-analysis-json-schemas");
const cam_review_json_schema_1 = require("../lease-analysis/cam-review-json-schema");
const amendment_analysis_prompts_1 = require("./amendment-analysis-prompts");
const json_parse_util_1 = require("../lease-analysis/json-parse.util");
let GroqAmendmentAnalysisService = GroqAmendmentAnalysisService_1 = class GroqAmendmentAnalysisService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GroqAmendmentAnalysisService_1.name);
        const key = this.config.get('GROQ_API_KEY')?.trim();
        this.client = key ? new groq_sdk_1.default({ apiKey: key }) : null;
    }
    ensureConfigured() {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot run amendment analysis.');
        }
    }
    jsonSchemaStrictEnabled() {
        const raw = this.config.get('GROQ_JSON_SCHEMA_STRICT');
        if (raw === undefined || raw === '')
            return true;
        return raw !== '0' && raw.toLowerCase() !== 'false';
    }
    async runGroqWithBackoff(label, fn) {
        const maxAttempts = GroqAmendmentAnalysisService_1.GROQ_BACKOFF_MAX_ATTEMPTS;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            }
            catch (err) {
                lastError = err;
                if (attempt === maxAttempts) {
                    break;
                }
                const exp = Math.min(GroqAmendmentAnalysisService_1.GROQ_BACKOFF_MAX_MS, GroqAmendmentAnalysisService_1.GROQ_BACKOFF_BASE_MS * 2 ** (attempt - 1));
                const jitter = Math.floor(Math.random() * GroqAmendmentAnalysisService_1.GROQ_BACKOFF_JITTER_MS);
                const waitMs = exp + jitter;
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Groq ${label} failed (attempt ${attempt}/${maxAttempts}): ${msg}; retrying in ${waitMs}ms`);
                await new Promise((resolve) => setTimeout(resolve, waitMs));
            }
        }
        throw lastError;
    }
    async extractSectionDelta(section, ocrPlainText, options) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot run amendment analysis.');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const strict = this.jsonSchemaStrictEnabled();
        const userContent = (0, amendment_analysis_prompts_1.buildAmendmentUserContent)(ocrPlainText, section, options.previousSectionJson);
        const schemaBody = lease_analysis_json_schemas_1.LEASE_ANALYSIS_JSON_SCHEMA[section];
        const messages = [
            { role: 'system', content: amendment_analysis_prompts_1.AMENDMENT_ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
        ];
        const completion = await this.runGroqWithBackoff(`chat.completions.create amendment-section=${section}`, () => this.client.chat.completions.create({
            model,
            messages,
            temperature: 0.1,
            max_completion_tokens: 10000,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: `amendment_analysis_${section}`,
                    description: `Delta extraction for ${lease_analysis_json_schemas_1.LEASE_ANALYSIS_SCHEMA_DESCRIPTION[section]}`,
                    strict,
                    schema: schemaBody,
                },
            },
        }));
        const usage = completion.usage;
        if (usage?.prompt_tokens_details?.cached_tokens != null) {
            this.logger.debug(`Groq amendment section=${section} prompt_tokens=${usage.prompt_tokens} cached_tokens=${usage.prompt_tokens_details.cached_tokens}`);
        }
        const raw = completion.choices[0]?.message?.content;
        if (!raw?.trim()) {
            throw new Error(`Groq returned empty content for amendment section ${section}`);
        }
        let parsed;
        try {
            parsed = (0, json_parse_util_1.parseJsonFromLlm)(raw);
        }
        catch (err) {
            this.logger.error(`JSON parse failed for amendment section ${section}: ${raw.slice(0, 800)}`);
            throw err;
        }
        return parsed;
    }
    async extractCamReviewDelta(ocrPlainText, previousCamJson) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot run amendment analysis.');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const strict = this.jsonSchemaStrictEnabled();
        const userContent = (0, amendment_analysis_prompts_1.buildAmendmentCamReviewUserContent)(ocrPlainText, previousCamJson);
        const section = 'camReview';
        const messages = [
            { role: 'system', content: amendment_analysis_prompts_1.AMENDMENT_ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
        ];
        const completion = await this.runGroqWithBackoff('chat.completions.create amendment-section=camReview', () => this.client.chat.completions.create({
            model,
            messages,
            temperature: 0.1,
            max_completion_tokens: 12000,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: `amendment_${cam_review_json_schema_1.CAM_REVIEW_SCHEMA_NAME}`,
                    description: `Delta extraction for ${cam_review_json_schema_1.CAM_REVIEW_SCHEMA_DESCRIPTION}`,
                    strict,
                    schema: cam_review_json_schema_1.CAM_REVIEW_JSON_SCHEMA,
                },
            },
        }));
        const raw = completion.choices[0]?.message?.content;
        if (!raw?.trim()) {
            throw new Error('Groq returned empty content for amendment camReview');
        }
        let parsed;
        try {
            parsed = (0, json_parse_util_1.parseJsonFromLlm)(raw);
        }
        catch (err) {
            this.logger.error(`JSON parse failed for amendment camReview: ${raw.slice(0, 800)}`);
            throw err;
        }
        return parsed;
    }
    async extractOperationalGuardrailsDelta(ocrPlainText, previousSectionJson) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot run amendment analysis.');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const strict = this.jsonSchemaStrictEnabled();
        const makeCall = (batch, schema) => {
            const userContent = (0, amendment_analysis_prompts_1.buildAmendmentOperationalGuardrailsUserContent)(ocrPlainText, batch, previousSectionJson);
            const messages = [
                { role: 'system', content: amendment_analysis_prompts_1.AMENDMENT_ANALYSIS_SYSTEM_PROMPT },
                { role: 'user', content: userContent },
            ];
            return this.runGroqWithBackoff(`chat.completions.create amendment-operationalGuardrails batch=${batch}`, () => this.client.chat.completions.create({
                model,
                messages,
                temperature: 0.1,
                max_completion_tokens: 10000,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: `amendment_analysis_operationalGuardrails_${batch}`,
                        description: `Delta extraction for operational guardrails — batch ${batch} of 2 (14 topics).`,
                        strict,
                        schema,
                    },
                },
            }));
        };
        const [completionA, completionB] = await Promise.all([
            makeCall('A', lease_analysis_json_schemas_1.operationalGuardrailsASchema),
            makeCall('B', lease_analysis_json_schemas_1.operationalGuardrailsBSchema),
        ]);
        const parseRaw = (completion, batch) => {
            const raw = completion.choices[0]?.message?.content;
            if (!raw?.trim()) {
                throw new Error(`Groq returned empty content for amendment operationalGuardrails batch ${batch}`);
            }
            try {
                return (0, json_parse_util_1.parseJsonFromLlm)(raw);
            }
            catch (err) {
                this.logger.error(`JSON parse failed for amendment operationalGuardrails batch ${batch}: ${raw.slice(0, 800)}`);
                throw err;
            }
        };
        const batchA = parseRaw(completionA, 'A');
        const batchB = parseRaw(completionB, 'B');
        return { ...batchA, ...batchB };
    }
};
exports.GroqAmendmentAnalysisService = GroqAmendmentAnalysisService;
GroqAmendmentAnalysisService.GROQ_BACKOFF_MAX_ATTEMPTS = 4;
GroqAmendmentAnalysisService.GROQ_BACKOFF_BASE_MS = 1000;
GroqAmendmentAnalysisService.GROQ_BACKOFF_MAX_MS = 30_000;
GroqAmendmentAnalysisService.GROQ_BACKOFF_JITTER_MS = 250;
exports.GroqAmendmentAnalysisService = GroqAmendmentAnalysisService = GroqAmendmentAnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GroqAmendmentAnalysisService);
//# sourceMappingURL=groq-amendment-analysis.service.js.map