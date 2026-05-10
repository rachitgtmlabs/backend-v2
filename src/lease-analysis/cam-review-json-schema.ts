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

export const CAM_REVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    ambiguities: { type: 'array', items: ambiguityItem },
    conflicts: { type: 'array', items: conflictItem },
    missingProvisions: { type: 'array', items: missingProvisionItem },
    tenantConcerns: { type: 'array', items: tenantConcernItem },
  },
  required: [
    'ambiguities',
    'conflicts',
    'missingProvisions',
    'tenantConcerns',
  ],
  additionalProperties: false,
} as const;

export const CAM_REVIEW_SCHEMA_NAME = 'cam_lease_review';
export const CAM_REVIEW_SCHEMA_DESCRIPTION =
  'CAM and operating-expense clause review: ambiguities, internal conflicts, ' +
  'missing standard provisions, and tenant-side concerns. Use empty arrays when none.';
