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

const operationalGuardrailsSchema = {
  type: 'object',
  properties: {
    useRestrictions: { type: 'array', items: { type: 'string' } },
    alterationRules: { type: 'array', items: { type: 'string' } },
    serviceLevels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          hours: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['service', 'hours', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['useRestrictions', 'alterationRules', 'serviceLevels'],
  additionalProperties: false,
} as const;

const legalNuancesSchema = {
  type: 'object',
  properties: {
    assignmentSubletting: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        citation: { type: 'string' },
        pageReference,
      },
      required: ['summary', 'citation', 'pageReference'],
      additionalProperties: false,
    },
    defaultRemedies: { type: 'array', items: { type: 'string' } },
    oddClauses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          detail: { type: 'string' },
          citation: { type: 'string' },
          pageReference,
        },
        required: ['label', 'detail', 'citation', 'pageReference'],
        additionalProperties: false,
      },
    },
  },
  required: ['assignmentSubletting', 'defaultRemedies', 'oddClauses'],
  additionalProperties: false,
} as const;

/** JSON Schema `schema` object passed to Groq (strict mode). */
export const LEASE_ANALYSIS_JSON_SCHEMA: Record<
  LeaseAnalysisSection,
  Record<string, unknown>
> = {
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
  executiveIdentity:
    'Parties, premises, lease identifiers, rent basis, deposit, renewal language.',
  financialStack:
    'Summary KPI cards (numeric values + unit + short citation), rent schedule rows, and additional charges from the lease OCR.',
  criticalDeadlines:
    'Risk counts by severity, dated milestones with citations, and deviation/risk narrative cards (risks array) with contextSummary, sectionReference, analysisText, and pageReference.',
  operationalGuardrails:
    'Use restrictions, alteration rules, and service-level expectations.',
  legalNuances:
    'Assignment/subletting summary, default remedies, and unusual clauses.',
};
