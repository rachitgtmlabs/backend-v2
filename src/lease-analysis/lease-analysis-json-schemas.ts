/**
 * Groq Structured Outputs JSON Schemas (strict mode compatible).
 * All objects: additionalProperties: false; all listed properties required.
 *
 * @see https://console.groq.com/docs/structured-outputs
 */
import type { LeaseAnalysisSection } from './lease-analysis.mocks';

const pageReference = {
  type: 'object',
  properties: {
    page: { type: 'number' },
    section: { type: 'string' },
    highlightText: { type: 'string' },
  },
  required: ['page', 'section', 'highlightText'],
  additionalProperties: false,
} as const;

const leaseField = {
  type: 'object',
  properties: {
    value: { type: 'string' },
    citation: { type: 'string' },
    pageReference,
    amendments: { type: 'array', items: { type: 'string' } },
  },
  required: ['value', 'citation', 'pageReference', 'amendments'],
  additionalProperties: false,
} as const;

const securityDepositField = {
  type: 'object',
  properties: {
    amount: { type: 'string' },
    conditions: { type: 'string' },
    citation: { type: 'string' },
    pageReference,
    amendments: { type: 'array', items: { type: 'string' } },
  },
  required: ['amount', 'conditions', 'citation', 'pageReference', 'amendments'],
  additionalProperties: false,
} as const;

/**
 * Executive Summary — markdown abstract rendered at the top of the
 * Executive Identity tab. `value` is a Markdown string with `###` headers
 * and bulleted lists (the frontend renders them with explicit styled
 * components). `citation` is a short reference (e.g. "p. 1, preamble").
 */
const executiveSummarySchema = {
  type: 'object',
  properties: {
    value: { type: 'string' },
    citation: { type: 'string' },
  },
  required: ['value', 'citation'],
  additionalProperties: false,
} as const;

/** Root shape matches frontend LeaseInfoResponse / MOCK_EXECUTIVE_IDENTITY. */
const executiveIdentitySchema = {
  type: 'object',
  properties: {
    leaseInformation: {
      type: 'object',
      properties: {
        lease: leaseField,
        property: leaseField,
        leaseFrom: leaseField,
        leaseTo: leaseField,
        squareFeet: leaseField,
        rentPerSqFt: leaseField,
        baseRent: leaseField,
        securityDeposit: securityDepositField,
        renewalOptions: leaseField,
      },
      required: [
        'lease',
        'property',
        'leaseFrom',
        'leaseTo',
        'squareFeet',
        'rentPerSqFt',
        'baseRent',
        'securityDeposit',
        'renewalOptions',
      ],
      additionalProperties: false,
    },
  },
  required: ['leaseInformation'],
  additionalProperties: false,
} as const;

const financialStackSchema = {
  type: 'object',
  properties: {
    summaryCards: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          numericValue: { type: 'number' },
          valueUnit: {
            type: 'string',
            enum: ['months', 'years', 'usd', 'percent', 'plain'],
          },
          citation: { type: 'string' },
        },
        required: ['title', 'numericValue', 'valueUnit', 'citation'],
        additionalProperties: false,
      },
    },
    rentSchedule: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          period: { type: 'string' },
          monthlyRent: { type: 'string' },
          annualRent: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['period', 'monthlyRent', 'annualRent', 'notes'],
        additionalProperties: false,
      },
    },
    additionalCharges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          amount: { type: 'string' },
        },
        required: ['label', 'amount'],
        additionalProperties: false,
      },
    },
  },
  required: ['summaryCards', 'rentSchedule', 'additionalCharges'],
  additionalProperties: false,
} as const;

const criticalDeadlinesSchema = {
  type: 'object',
  properties: {
    riskSummary: {
      type: 'object',
      properties: {
        high: { type: 'integer' },
        medium: { type: 'integer' },
        low: { type: 'integer' },
      },
      required: ['high', 'medium', 'low'],
      additionalProperties: false,
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          date: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          citation: { type: 'string' },
          pageReference,
        },
        required: ['title', 'date', 'severity', 'citation', 'pageReference'],
        additionalProperties: false,
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low'],
          },
          contextSummary: { type: 'string' },
          sectionReference: { type: 'string' },
          analysisText: { type: 'string' },
          citation: { type: 'string' },
          pageReference,
        },
        required: [
          'title',
          'severity',
          'contextSummary',
          'sectionReference',
          'analysisText',
          'citation',
          'pageReference',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['riskSummary', 'milestones', 'risks'],
  additionalProperties: false,
} as const;

/**
 * Operational Guardrails — misc-style structured provisions.
 * Each topic (use / alterations / services / signs) carries:
 *  - synopsis: one-line plain-English summary
 *  - keyParameters: enumerated quantitative or rule parameters (thresholds, hours, fees)
 *  - narrative: longer human explanation with caveats / context
 *  - certainty: model's confidence that the OCR fully supports the extraction
 */
const certaintyEnum = {
  type: 'string',
  enum: ['low', 'medium', 'high'],
} as const;

const provisionField = {
  type: 'object',
  properties: {
    value: { type: 'string' },
    citation: { type: 'string' },
    pageReference,
    amendments: { type: 'array', items: { type: 'string' } },
  },
  required: ['value', 'citation', 'pageReference', 'amendments'],
  additionalProperties: false,
} as const;

const provisionTopic = {
  type: 'object',
  properties: {
    synopsis: provisionField,
    keyParameters: provisionField,
    narrative: provisionField,
    certainty: certaintyEnum,
  },
  required: ['synopsis', 'keyParameters', 'narrative', 'certainty'],
  additionalProperties: false,
} as const;

const operationalGuardrailsSchema = {
  type: 'object',
  properties: {
    use: provisionTopic,
    alterations: provisionTopic,
    services: provisionTopic,
    signs: provisionTopic,
  },
  required: ['use', 'alterations', 'services', 'signs'],
  additionalProperties: false,
} as const;

/**
 * Legal Nuances — audit-style structured risk register.
 * Each issue is a flag that needs human review, grouped by section.
 */
const riskIssue = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: [
        'Ambiguity',
        'Conflict',
        'Risk',
        'Subjectivity',
        'Missing Exhibit',
        'Dependency',
        'Non-Standard',
        'Inconsistency',
      ],
    },
    issueDescription: { type: 'string' },
    affectedClause: { type: 'string' },
    citation: { type: 'string' },
    pageReference,
    certaintyLevel: certaintyEnum,
    recommendedAction: { type: 'string' },
  },
  required: [
    'category',
    'issueDescription',
    'affectedClause',
    'citation',
    'pageReference',
    'certaintyLevel',
    'recommendedAction',
  ],
  additionalProperties: false,
} as const;

const legalNuancesSchema = {
  type: 'object',
  properties: {
    riskRegister: {
      type: 'object',
      properties: {
        counts: {
          type: 'object',
          properties: {
            high: { type: 'integer' },
            medium: { type: 'integer' },
            low: { type: 'integer' },
          },
          required: ['high', 'medium', 'low'],
          additionalProperties: false,
        },
        overallCertainty: certaintyEnum,
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sectionName: { type: 'string' },
              issues: { type: 'array', items: riskIssue },
            },
            required: ['sectionName', 'issues'],
            additionalProperties: false,
          },
        },
      },
      required: ['counts', 'overallCertainty', 'sections'],
      additionalProperties: false,
    },
  },
  required: ['riskRegister'],
  additionalProperties: false,
} as const;

/** JSON Schema `schema` object passed to Groq (strict mode). */
export const LEASE_ANALYSIS_JSON_SCHEMA: Record<
  LeaseAnalysisSection,
  Record<string, unknown>
> = {
  executiveSummary: { ...executiveSummarySchema },
  executiveIdentity: {
    ...executiveIdentitySchema,
  },
  financialStack: { ...financialStackSchema },
  criticalDeadlines: { ...criticalDeadlinesSchema },
  operationalGuardrails: { ...operationalGuardrailsSchema },
  legalNuances: { ...legalNuancesSchema },
};

/** Short descriptions for json_schema.description (hints only; structure comes from schema). */
export const LEASE_ANALYSIS_SCHEMA_DESCRIPTION: Record<
  LeaseAnalysisSection,
  string
> = {
  executiveSummary:
    'Markdown executive brief (200-350 words): parties, premises, headline economics, term & options, and what to watch. Uses `###` section headers and bulleted lists.',
  executiveIdentity:
    'Parties, premises, lease identifiers, rent basis, deposit, renewal language.',
  financialStack:
    'Summary KPI cards (numeric values + unit + short citation), rent schedule rows, and additional charges from the lease OCR.',
  criticalDeadlines:
    'Risk counts by severity, dated milestones with citations, and deviation/risk narrative cards (risks array) with contextSummary, sectionReference, analysisText, and pageReference.',
  operationalGuardrails:
    'Structured per-topic provisions (use, alterations, services, signs) — each with synopsis, key parameters, narrative, and an extraction certainty level.',
  legalNuances:
    'Audit-style risk register: grouped flagged issues for human review, each with category, certainty level, citation, and a recommended next action.',
};
