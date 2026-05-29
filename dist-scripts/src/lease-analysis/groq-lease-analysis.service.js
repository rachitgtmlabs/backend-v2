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
var GroqLeaseAnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqLeaseAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const lease_analysis_json_schemas_1 = require("./lease-analysis-json-schemas");
const lease_analysis_section_prompts_1 = require("./lease-analysis-section-prompts");
const json_parse_util_1 = require("./json-parse.util");
const cam_review_json_schema_1 = require("./cam-review-json-schema");
const cam_review_prompts_1 = require("./cam-review-prompts");
let GroqLeaseAnalysisService = GroqLeaseAnalysisService_1 = class GroqLeaseAnalysisService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GroqLeaseAnalysisService_1.name);
        const key = this.config.get('GROQ_API_KEY')?.trim();
        this.client = key ? new groq_sdk_1.default({ apiKey: key }) : null;
    }
    ensureConfigured() {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot run lease analysis.');
        }
    }
    buildUserContent(ocrPlainText, section) {
        const tail = lease_analysis_section_prompts_1.SECTION_USER_TAIL[section];
        return `${ocrPlainText}\n\n---\n\n${tail}`;
    }
    jsonSchemaStrictEnabled() {
        const raw = this.config.get('GROQ_JSON_SCHEMA_STRICT');
        if (raw === undefined || raw === '')
            return true;
        return raw !== '0' && raw.toLowerCase() !== 'false';
    }
    async runGroqWithBackoff(label, fn) {
        const maxAttempts = GroqLeaseAnalysisService_1.GROQ_BACKOFF_MAX_ATTEMPTS;
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
                const exp = Math.min(GroqLeaseAnalysisService_1.GROQ_BACKOFF_MAX_MS, GroqLeaseAnalysisService_1.GROQ_BACKOFF_BASE_MS * 2 ** (attempt - 1));
                const jitter = Math.floor(Math.random() * GroqLeaseAnalysisService_1.GROQ_BACKOFF_JITTER_MS);
                const waitMs = exp + jitter;
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Groq ${label} failed (attempt ${attempt}/${maxAttempts}): ${msg}; retrying in ${waitMs}ms`);
                await new Promise((resolve) => setTimeout(resolve, waitMs));
            }
        }
        throw lastError;
    }
    async extractSectionJson(section, ocrPlainText) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot run lease analysis.');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const strict = this.jsonSchemaStrictEnabled();
        const userContent = this.buildUserContent(ocrPlainText, section);
        const schemaBody = lease_analysis_json_schemas_1.LEASE_ANALYSIS_JSON_SCHEMA[section];
        const messages = [
            { role: 'system', content: lease_analysis_section_prompts_1.LEASE_ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
        ];
        const completion = await this.runGroqWithBackoff(`chat.completions.create section=${section}`, () => this.client.chat.completions.create({
            model,
            messages,
            temperature: 0.1,
            max_completion_tokens: 10000,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: `lease_analysis_${section}`,
                    description: lease_analysis_json_schemas_1.LEASE_ANALYSIS_SCHEMA_DESCRIPTION[section],
                    strict,
                    schema: schemaBody,
                },
            },
        }));
        const usage = completion.usage;
        if (usage?.prompt_tokens_details?.cached_tokens != null) {
            this.logger.debug(`Groq section=${section} prompt_tokens=${usage.prompt_tokens} cached_tokens=${usage.prompt_tokens_details.cached_tokens}`);
        }
        const raw = completion.choices[0]?.message?.content;
        if (!raw?.trim()) {
            throw new Error(`Groq returned empty content for section ${section}`);
        }
        let parsed;
        try {
            parsed = (0, json_parse_util_1.parseJsonFromLlm)(raw);
        }
        catch (err) {
            this.logger.error(`JSON parse failed for section ${section}: ${raw.slice(0, 800)}`);
            throw err;
        }
        return parsed;
    }
    async extractOperationalGuardrailsJson(ocrPlainText) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot run lease analysis.');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const strict = this.jsonSchemaStrictEnabled();
        const makeCall = (tail, schema, batch) => {
            const userContent = `${ocrPlainText}\n\n---\n\n${tail}`;
            const messages = [
                { role: 'system', content: lease_analysis_section_prompts_1.LEASE_ANALYSIS_SYSTEM_PROMPT },
                { role: 'user', content: userContent },
            ];
            return this.runGroqWithBackoff(`chat.completions.create section=operationalGuardrails batch=${batch}`, () => this.client.chat.completions.create({
                model,
                messages,
                temperature: 0.1,
                max_completion_tokens: 10000,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: `lease_analysis_operationalGuardrails_${batch}`,
                        description: `Operational Guardrails structured provisions — batch ${batch} of 2 (14 topics).`,
                        strict,
                        schema,
                    },
                },
            }));
        };
        const [completionA, completionB] = await Promise.all([
            makeCall(lease_analysis_section_prompts_1.OPERATIONAL_GUARDRAILS_A_TAIL, lease_analysis_json_schemas_1.operationalGuardrailsASchema, 'A'),
            makeCall(lease_analysis_section_prompts_1.OPERATIONAL_GUARDRAILS_B_TAIL, lease_analysis_json_schemas_1.operationalGuardrailsBSchema, 'B'),
        ]);
        const parseRaw = (completion, batch) => {
            const raw = completion.choices[0]?.message?.content;
            if (!raw?.trim()) {
                throw new Error(`Groq returned empty content for operationalGuardrails batch ${batch}`);
            }
            try {
                return (0, json_parse_util_1.parseJsonFromLlm)(raw);
            }
            catch (err) {
                this.logger.error(`JSON parse failed for operationalGuardrails batch ${batch}: ${raw.slice(0, 800)}`);
                throw err;
            }
        };
        const batchA = parseRaw(completionA, 'A');
        const batchB = parseRaw(completionB, 'B');
        return { ...batchA, ...batchB };
    }
    buildCamReviewUserContent(ocrPlainText) {
        return `${ocrPlainText}\n\n---\n\n${cam_review_prompts_1.CAM_REVIEW_USER_TAIL}`;
    }
    async extractCamReviewJson(ocrPlainText) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot run lease analysis.');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const strict = this.jsonSchemaStrictEnabled();
        const userContent = this.buildCamReviewUserContent(ocrPlainText);
        const messages = [
            { role: 'system', content: lease_analysis_section_prompts_1.LEASE_ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
        ];
        const completion = await this.runGroqWithBackoff('chat.completions.create section=camReview', () => this.client.chat.completions.create({
            model,
            messages,
            temperature: 0.1,
            max_completion_tokens: 12000,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: cam_review_json_schema_1.CAM_REVIEW_SCHEMA_NAME,
                    description: cam_review_json_schema_1.CAM_REVIEW_SCHEMA_DESCRIPTION,
                    strict,
                    schema: cam_review_json_schema_1.CAM_REVIEW_JSON_SCHEMA,
                },
            },
        }));
        const raw = completion.choices[0]?.message?.content;
        if (!raw?.trim()) {
            throw new Error('Groq returned empty content for camReview');
        }
        let parsed;
        try {
            parsed = (0, json_parse_util_1.parseJsonFromLlm)(raw);
        }
        catch (err) {
            this.logger.error(`JSON parse failed for camReview: ${raw.slice(0, 800)}`);
            throw err;
        }
        return parsed;
    }
    async proposeComplianceReplacement(input) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot propose clause wording.');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const chunks = [
            `Risk topic: ${input.riskTitle}`,
            `Severity: ${input.severity ?? 'unspecified'}`,
            `Jurisdiction summary: ${input.jurisdictionSummary}`,
            `Lease provision to replace:\n"""${input.originalClause}"""`,
        ];
        const draft = input.existingProposedClause?.trim();
        if (draft) {
            chunks.push(`Optional starting suggestion (rewrite or supersede):\n"""${draft}"""`);
        }
        chunks.push('Write ONLY replacement lease/amendment language that could substitute for the cited provision. Be concise, professional, jurisdiction-aware where indicated. ', 'Do not paste the objectionable clause back as the solution.', 'End with one sentence that counsel must review before execution.');
        const messages = [
            {
                role: 'system',
                content: 'You are a senior commercial real estate paralegal drafting neutral, legally conservative replacement language.',
            },
            {
                role: 'user',
                content: chunks.join('\n\n'),
            },
        ];
        const completion = await this.runGroqWithBackoff('chat.completions.create proposed-clause', () => this.client.chat.completions.create({
            model,
            messages,
            temperature: 0.15,
            max_completion_tokens: 900,
        }));
        const raw = completion.choices[0]?.message?.content?.trim();
        if (!raw) {
            throw new Error('Groq returned empty proposed clause text');
        }
        return raw;
    }
    async draftAddendumMarkdown(input) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not configured; cannot draft addendum.');
        }
        const model = this.config.get('GROQ_MODEL')?.trim() ?? 'openai/gpt-oss-120b';
        const landlord = input.landlordName?.trim() || '[Landlord Name]';
        const tenant = input.tenantName?.trim() || '[Tenant Name]';
        const leaseTitle = input.leaseTitle?.trim() || 'the Lease Agreement';
        const effectiveDate = input.effectiveDate?.trim() || '[Effective Date]';
        const userBlocks = [
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
                role: 'system',
                content: 'You are a senior commercial real estate paralegal. You produce clean, conservative, well-structured lease amendment drafts in Markdown for attorney review.',
            },
            {
                role: 'user',
                content: userBlocks.join('\n\n'),
            },
        ];
        const completion = await this.runGroqWithBackoff('chat.completions.create draft-addendum', () => this.client.chat.completions.create({
            model,
            messages,
            temperature: 0.2,
            max_completion_tokens: 1800,
        }));
        const raw = completion.choices[0]?.message?.content?.trim();
        if (!raw) {
            throw new Error('Groq returned empty addendum markdown');
        }
        return stripCodeFences(raw);
    }
};
exports.GroqLeaseAnalysisService = GroqLeaseAnalysisService;
GroqLeaseAnalysisService.GROQ_BACKOFF_MAX_ATTEMPTS = 4;
GroqLeaseAnalysisService.GROQ_BACKOFF_BASE_MS = 1000;
GroqLeaseAnalysisService.GROQ_BACKOFF_MAX_MS = 30_000;
GroqLeaseAnalysisService.GROQ_BACKOFF_JITTER_MS = 250;
exports.GroqLeaseAnalysisService = GroqLeaseAnalysisService = GroqLeaseAnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GroqLeaseAnalysisService);
function stripCodeFences(text) {
    const trimmed = text.trim();
    const fence = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i;
    const m = trimmed.match(fence);
    return m ? m[1].trim() : trimmed;
}
//# sourceMappingURL=groq-lease-analysis.service.js.map