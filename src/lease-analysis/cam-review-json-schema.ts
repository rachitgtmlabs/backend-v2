/**
 * Groq structured-outputs JSON Schema for CAM / operating expense review.
 * Strict mode: all object keys required; use empty arrays when nothing found.
 */

const ambiguityItem = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    location: { type: 'string' },
    potentialIssue: { type: 'string' },
    recommendedAction: { type: 'string' },
  },
  required: [
    'description',
    'location',
    'potentialIssue',
    'recommendedAction',
  ],
  additionalProperties: false,
} as const;

const conflictItem = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    conflictingProvisions: { type: 'array', items: { type: 'string' } },
    potentialResolution: { type: 'string' },
  },
  required: ['description', 'conflictingProvisions', 'potentialResolution'],
  additionalProperties: false,
} as const;

const missingProvisionItem = {
  type: 'object',
  properties: {
    provisionType: { type: 'string' },
    significance: { type: 'string', enum: ['Low', 'Medium', 'High'] },
    tenantRisk: { type: 'string' },
  },
  required: ['provisionType', 'significance', 'tenantRisk'],
  additionalProperties: false,
} as const;

const tenantConcernItem = {
  type: 'object',
  properties: {
    concernType: { type: 'string' },
    description: { type: 'string' },
    riskLevel: {
      type: 'string',
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
  },
  required: ['concernType', 'description', 'riskLevel'],
  additionalProperties: false,
} as const;

const camRuleItem = {
  type: 'object',
  properties: {
    ruleId: { type: 'string' },
    pageNumber: { type: 'integer' },
    ruleText: { type: 'string' },
    ruleCategory: {
      type: 'string',
      enum: [
        'proportionateShare',
        'camExpenseCategories',
        'exclusions',
        'paymentTerms',
        'capsLimitations',
        'reconciliationProcedures',
        'baseYearProvisions',
        'grossUpProvisions',
        'administrativeFees',
        'auditRights',
        'noticeRequirements',
        'controllableVsNonControllable',
        'definitions',
        'calculationMethods',
      ],
    },
    confidenceScore: { type: 'number' },
    sourcePages: { type: 'array', items: { type: 'integer' } },
  },
  required: [
    'ruleId',
    'pageNumber',
    'ruleText',
    'ruleCategory',
    'confidenceScore',
    'sourcePages',
  ],
  additionalProperties: false,
} as const;

const flagsAndObservationsSchema = {
  type: 'object',
  properties: {
    ambiguities: { type: 'array', items: { type: 'string' } },
    conflicts: { type: 'array', items: { type: 'string' } },
    missingProvisions: { type: 'array', items: { type: 'string' } },
    tenantConcerns: { type: 'array', items: { type: 'string' } },
  },
  required: ['ambiguities', 'conflicts', 'missingProvisions', 'tenantConcerns'],
  additionalProperties: false,
} as const;

const rulesByCategorySchema = {
  type: 'object',
  properties: {
    proportionateShare: { type: 'integer' },
    camExpenseCategories: { type: 'integer' },
    exclusions: { type: 'integer' },
    paymentTerms: { type: 'integer' },
    capsLimitations: { type: 'integer' },
    reconciliationProcedures: { type: 'integer' },
    baseYearProvisions: { type: 'integer' },
    grossUpProvisions: { type: 'integer' },
    administrativeFees: { type: 'integer' },
    auditRights: { type: 'integer' },
    noticeRequirements: { type: 'integer' },
    controllableVsNonControllable: { type: 'integer' },
    definitions: { type: 'integer' },
    calculationMethods: { type: 'integer' },
  },
  required: [
    'proportionateShare',
    'camExpenseCategories',
    'exclusions',
    'paymentTerms',
    'capsLimitations',
    'reconciliationProcedures',
    'baseYearProvisions',
    'grossUpProvisions',
    'administrativeFees',
    'auditRights',
    'noticeRequirements',
    'controllableVsNonControllable',
    'definitions',
    'calculationMethods',
  ],
  additionalProperties: false,
} as const;

const summarySchema = {
  type: 'object',
  properties: {
    totalRulesExtracted: { type: 'integer' },
    rulesByCategory: rulesByCategorySchema,
    overallTenantRiskAssessment: {
      type: 'string',
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    keyTenantProtections: { type: 'array', items: { type: 'string' } },
    keyTenantExposures: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'totalRulesExtracted',
    'rulesByCategory',
    'overallTenantRiskAssessment',
    'keyTenantProtections',
    'keyTenantExposures',
  ],
  additionalProperties: false,
} as const;

export const CAM_REVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    ambiguities: { type: 'array', items: ambiguityItem },
    conflicts: { type: 'array', items: conflictItem },
    missingProvisions: { type: 'array', items: missingProvisionItem },
    tenantConcerns: { type: 'array', items: tenantConcernItem },
    camRules: { type: 'array', items: camRuleItem },
    flagsAndObservations: flagsAndObservationsSchema,
    summary: summarySchema,
  },
  required: [
    'ambiguities',
    'conflicts',
    'missingProvisions',
    'tenantConcerns',
    'camRules',
    'flagsAndObservations',
    'summary',
  ],
  additionalProperties: false,
} as const;

export const CAM_REVIEW_SCHEMA_NAME = 'cam_lease_review';
export const CAM_REVIEW_SCHEMA_DESCRIPTION =
  'CAM and operating-expense clause review: ambiguities, internal conflicts, ' +
  'missing standard provisions, tenant-side concerns, extracted CAM rules, ' +
  'flags and observations, and an overall summary. Use empty arrays when none.';
