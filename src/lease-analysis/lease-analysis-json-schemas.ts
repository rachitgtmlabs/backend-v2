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

/**
 * Space & Premises — 13 structured fields ported from the legacy v1
 * `space` extraction. Each leaf uses the standard leaseField shape
 * (value/citation/pageReference/amendments) so the frontend's existing
 * citation-to-PDF behavior works without changes.
 *
 * The `parking` field is unusual: it has its own value/citation PLUS a
 * nested `type` sub-field for the parking arrangement (covered, surface,
 * exclusive, etc.) — mirrors the v1 shape.
 */
const parkingField = {
  type: 'object',
  properties: {
    value: { type: 'string' },
    citation: { type: 'string' },
    pageReference,
    amendments: { type: 'array', items: { type: 'string' } },
    type: leaseField,
  },
  required: ['value', 'citation', 'pageReference', 'amendments', 'type'],
  additionalProperties: false,
} as const;

const spaceAndPremisesSchema = {
  type: 'object',
  properties: {
    unit: leaseField,
    building: leaseField,
    premises: leaseField,
    zipCode: leaseField,
    city: leaseField,
    state: leaseField,
    areaRentable: leaseField,
    areaUsable: leaseField,
    commonArea: leaseField,
    parking: parkingField,
    storageArea: leaseField,
    status: leaseField,
    notes: leaseField,
  },
  required: [
    'unit',
    'building',
    'premises',
    'zipCode',
    'city',
    'state',
    'areaRentable',
    'areaUsable',
    'commonArea',
    'parking',
    'storageArea',
    'status',
    'notes',
  ],
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

/**
 * Late-fee penalty structure ported from v1 chargeSchedules.lateFee.
 * Seven leaseField-shaped properties: primary fee (grace/percent/calc),
 * secondary fee (grace/percent/calc) which kicks in if the primary
 * cure window expires, and a per-day fee. Frontend renders these
 * tiered in the Financial Stack tab.
 */
const lateFeesSchema = {
  type: 'object',
  properties: {
    calculationType: leaseField,
    graceDays: leaseField,
    percent: leaseField,
    secondFeeCalculationType: leaseField,
    secondFeeGrace: leaseField,
    secondFeePercent: leaseField,
    perDayFee: leaseField,
  },
  required: [
    'calculationType',
    'graceDays',
    'percent',
    'secondFeeCalculationType',
    'secondFeeGrace',
    'secondFeePercent',
    'perDayFee',
  ],
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
    lateFees: lateFeesSchema,
  },
  required: ['summaryCards', 'rentSchedule', 'additionalCharges', 'lateFees'],
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

/**
 * Operational Guardrails — 24 provision topics ported from legacy v1
 * `otherLeaseProvisions`. The original four (use/alterations/services/
 * signs) are kept; 20 new topics are added to mirror v1 coverage.
 *
 * Groq strict mode requires every property to be listed in `required`,
 * so all 24 topics are in the schema. Topics that the lease does NOT
 * address are still returned by the LLM (with empty value strings and
 * certainty="low"), then stripped server-side before the stream event
 * is emitted (see LeaseAnalysisService.pruneEmptyProvisionTopics).
 */
const operationalGuardrailsSchema = {
  type: 'object',
  properties: {
    // Property Use & Operations (the original 4)
    use: provisionTopic,
    alterations: provisionTopic,
    services: provisionTopic,
    signs: provisionTopic,
    // Term & Tenure
    premisesAndTerm: provisionTopic,
    holdover: provisionTopic,
    expansionAndRelocation: provisionTopic,
    rightOfFirstRefusalOffer: provisionTopic,
    // Financial Obligations
    taxes: provisionTopic,
    operatingExpenses: provisionTopic,
    insurance: provisionTopic,
    brokerage: provisionTopic,
    // Maintenance & Premises Rules
    repairsAndMaintenance: provisionTopic,
    parking: provisionTopic,
    hazardousMaterials: provisionTopic,
    rulesAndRegulations: provisionTopic,
    // Access, Transfer & Tenancy
    landlordsRightOfEntry: provisionTopic,
    quietEnjoyment: provisionTopic,
    assignmentAndSubletting: provisionTopic,
    // Risk, Default & Recovery
    defaultAndRemedies: provisionTopic,
    landlordDefault: provisionTopic,
    casualty: provisionTopic,
    condemnation: provisionTopic,
    liabilityAndIndemnification: provisionTopic,
    liens: provisionTopic,
    // Administrative & Closing
    notices: provisionTopic,
    estoppel: provisionTopic,
    subordination: provisionTopic,
  },
  required: [
    'use',
    'alterations',
    'services',
    'signs',
    'premisesAndTerm',
    'holdover',
    'expansionAndRelocation',
    'rightOfFirstRefusalOffer',
    'taxes',
    'operatingExpenses',
    'insurance',
    'brokerage',
    'repairsAndMaintenance',
    'parking',
    'hazardousMaterials',
    'rulesAndRegulations',
    'landlordsRightOfEntry',
    'quietEnjoyment',
    'assignmentAndSubletting',
    'defaultAndRemedies',
    'landlordDefault',
    'casualty',
    'condemnation',
    'liabilityAndIndemnification',
    'liens',
    'notices',
    'estoppel',
    'subordination',
  ],
  additionalProperties: false,
} as const;

/**
 * Batch A — first 14 operational-guardrails topics.
 * Splitting the 28-topic schema into two parallel calls avoids the nesting
 * drift that causes json_validate_failed on longer generations.
 */
export const operationalGuardrailsASchema = {
  type: 'object',
  properties: {
    use: provisionTopic,
    alterations: provisionTopic,
    services: provisionTopic,
    signs: provisionTopic,
    premisesAndTerm: provisionTopic,
    holdover: provisionTopic,
    expansionAndRelocation: provisionTopic,
    rightOfFirstRefusalOffer: provisionTopic,
    taxes: provisionTopic,
    operatingExpenses: provisionTopic,
    insurance: provisionTopic,
    brokerage: provisionTopic,
    repairsAndMaintenance: provisionTopic,
    parking: provisionTopic,
  },
  required: [
    'use',
    'alterations',
    'services',
    'signs',
    'premisesAndTerm',
    'holdover',
    'expansionAndRelocation',
    'rightOfFirstRefusalOffer',
    'taxes',
    'operatingExpenses',
    'insurance',
    'brokerage',
    'repairsAndMaintenance',
    'parking',
  ],
  additionalProperties: false,
} as const;

/** Batch B — last 14 operational-guardrails topics. */
export const operationalGuardrailsBSchema = {
  type: 'object',
  properties: {
    hazardousMaterials: provisionTopic,
    rulesAndRegulations: provisionTopic,
    landlordsRightOfEntry: provisionTopic,
    quietEnjoyment: provisionTopic,
    assignmentAndSubletting: provisionTopic,
    defaultAndRemedies: provisionTopic,
    landlordDefault: provisionTopic,
    casualty: provisionTopic,
    condemnation: provisionTopic,
    liabilityAndIndemnification: provisionTopic,
    liens: provisionTopic,
    notices: provisionTopic,
    estoppel: provisionTopic,
    subordination: provisionTopic,
  },
  required: [
    'hazardousMaterials',
    'rulesAndRegulations',
    'landlordsRightOfEntry',
    'quietEnjoyment',
    'assignmentAndSubletting',
    'defaultAndRemedies',
    'landlordDefault',
    'casualty',
    'condemnation',
    'liabilityAndIndemnification',
    'liens',
    'notices',
    'estoppel',
    'subordination',
  ],
  additionalProperties: false,
} as const;

/**
 * Full list of operational-guardrails topic keys. Exposed so the
 * service post-processing step can iterate them when pruning empty
 * topics from the LLM response.
 */
export const OPERATIONAL_GUARDRAILS_TOPIC_KEYS = [
  'use',
  'alterations',
  'services',
  'signs',
  'premisesAndTerm',
  'holdover',
  'expansionAndRelocation',
  'rightOfFirstRefusalOffer',
  'taxes',
  'operatingExpenses',
  'insurance',
  'brokerage',
  'repairsAndMaintenance',
  'parking',
  'hazardousMaterials',
  'rulesAndRegulations',
  'landlordsRightOfEntry',
  'quietEnjoyment',
  'assignmentAndSubletting',
  'defaultAndRemedies',
  'landlordDefault',
  'casualty',
  'condemnation',
  'liabilityAndIndemnification',
  'liens',
  'notices',
  'estoppel',
  'subordination',
] as const;

export type OperationalGuardrailsTopicKey =
  (typeof OPERATIONAL_GUARDRAILS_TOPIC_KEYS)[number];

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
  spaceAndPremises: { ...spaceAndPremisesSchema },
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
  spaceAndPremises:
    'Structured premises metadata — unit, building, address (city/state/zip), areas (rentable/usable/common-area load), parking allocation + parking type, storage, occupancy status, and free-text notes.',
  executiveIdentity:
    'Parties, premises, lease identifiers, rent basis, deposit, renewal language.',
  financialStack:
    'Summary KPI cards (numeric values + unit + short citation), rent schedule rows, and additional charges from the lease OCR.',
  criticalDeadlines:
    'Risk counts by severity, dated milestones with citations, and deviation/risk narrative cards (risks array) with contextSummary, sectionReference, analysisText, and pageReference.',
  operationalGuardrails:
    'Structured per-topic provisions across 24 topics covering use, term, financial, maintenance, access/transfer, risk/default, and administrative clauses. Each topic carries synopsis, key parameters, narrative, and an extraction certainty level. Topics not addressed by the lease are returned with empty values and pruned server-side.',
  legalNuances:
    'Audit-style risk register: grouped flagged issues for human review, each with category, certainty level, citation, and a recommended next action.',
};
