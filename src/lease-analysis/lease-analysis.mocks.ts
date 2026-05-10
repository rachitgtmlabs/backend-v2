/** Mock payloads for streaming lease analysis (replace with real extraction later). */

export type LeaseAnalysisSection =
  | 'executiveIdentity'
  | 'financialStack'
  | 'criticalDeadlines'
  | 'operationalGuardrails'
  | 'legalNuances';

function field(
  value: string,
  citation: string,
  amendments: string[] = [],
): { value: string; citation: string; amendments: string[] } {
  return { value, citation, amendments };
}

export const MOCK_EXECUTIVE_IDENTITY = {
  leaseInformation: {
    lease: field('L-2024-NYC-0142', 'p. 1, §1.1'),
    property: field(
      'Suite 1200, 450 Park Avenue, New York, NY 10022',
      'p. 2, Exhibit A',
    ),
    leaseFrom: field('Hudson Realty Holdings LLC', 'p. 1, preamble'),
    leaseTo: field('Northwind Analytics Inc.', 'p. 1, preamble'),
    squareFeet: field('18,450 rentable sf', 'p. 3, §2.2'),
    baseRent: field('$52.00 / rsf / year ($79,950 / month)', 'p. 8, §4.1'),
    securityDeposit: field('$239,850 (3 months)', 'p. 9, §5.3'),
    renewalOptions: field(
      'Two (2) successive five (5) year terms at FMV',
      'p. 12, §8.2',
    ),
  },
};

export const MOCK_FINANCIAL_STACK = {
  summaryCards: [
    {
      title: 'Total contract value',
      numericValue: 1425800,
      valueUnit: 'usd',
      citation: 'p. 8',
    },
    {
      title: 'Current monthly payment',
      numericValue: 12450,
      valueUnit: 'usd',
      citation: 'p. 4',
    },
    {
      title: 'Next rent escalation',
      numericValue: 3,
      valueUnit: 'percent',
      citation: 'p. 8',
    },
  ],
  rentSchedule: [
    {
      period: 'Years 1–3',
      monthlyRent: '$79,950',
      annualRent: '$959,400',
      notes: 'Base term',
    },
    {
      period: 'Years 4–5',
      monthlyRent: '$82,348',
      annualRent: '$988,176',
      notes: '3% escalation',
    },
  ],
  additionalCharges: [
    { label: 'CAM (2026 est.)', amount: '$8.25 / rsf' },
    { label: 'Taxes (2026 est.)', amount: '$14.10 / rsf' },
    { label: 'Insurance', amount: 'Pro-rata share' },
  ],
};

export const MOCK_CRITICAL_DEADLINES = {
  riskSummary: { high: 2, medium: 5, low: 4 },
  milestones: [
    {
      title: 'Rent commencement',
      date: '2025-06-01',
      severity: 'high',
      citation: 'p. 4',
      pageReference: { page: 4, section: '§4', highlightText: '' },
    },
    {
      title: 'First escalation window',
      date: '2026-10-01',
      severity: 'medium',
      citation: 'p. 8',
      pageReference: { page: 8, section: '§8', highlightText: '' },
    },
    {
      title: 'Insurance certificate renewal',
      date: 'Annually by Jan 15',
      severity: 'medium',
      citation: 'p. 22',
      pageReference: { page: 22, section: '', highlightText: '' },
    },
  ],
  risks: [
    {
      title: 'Late Fee Ceiling Violation',
      severity: 'critical',
      contextSummary: 'Lease Mandates a 10% daily late fee.',
      sectionReference: 'Section 4.2',
      analysisText:
        'NY Property Law 238-a caps late fees at 5% or $50. This clause is legally enforceable and creates litigation risk.',
      citation: 'p. 6, §4.2',
      pageReference: { page: 6, section: 'Section 4.2', highlightText: '' },
    },
    {
      title: 'Invalid Security Deposit Handling',
      severity: 'critical',
      contextSummary:
        'Lease allows Landlord to commingle security funds with operating capital.',
      sectionReference: 'Section 7.0',
      analysisText:
        'NY General Obligations Law § 7-103 requires security deposits to be held in trust. This is a statutory violation.',
      citation: 'p. 10, §7',
      pageReference: { page: 10, section: 'Section 7.0', highlightText: '' },
    },
    {
      title: 'Expired Renewal Window',
      severity: 'critical',
      contextSummary:
        "The 180-day notice period for the next term ended on March 15, 2026.",
      sectionReference: 'Section 15.1',
      analysisText:
        'The Tenant is currently in a "Holdover" position. Landlord can now legally increase rent by 200% or terminate occupancy with 30 days\' notice.',
      citation: 'p. 28, §15.1',
      pageReference: { page: 28, section: 'Section 15.1', highlightText: '' },
    },
  ],
};

export const MOCK_OPERATIONAL_GUARDRAILS = {
  useRestrictions: [
    'Office use only; no heavy manufacturing',
    'No hazardous materials without landlord consent',
  ],
  alterationRules: [
    'Non-structural alterations under $25k: tenant notice only',
    'Above threshold: landlord consent (not unreasonably withheld)',
  ],
  serviceLevels: [
    { service: 'HVAC', hours: 'Business hours per building standard' },
    { service: 'Janitorial', detail: '5x weekly, Class A spec' },
  ],
};

export const MOCK_LEGAL_NUANCES = {
  assignmentSubletting: {
    summary:
      'Consent required; landlord may terminate or recapture on proposed assignment.',
    citation: 'p. 18–19',
  },
  defaultRemedies: [
    '15-day notice to cure for monetary default',
    '30-day notice for non-monetary (if curable)',
  ],
  oddClauses: [
    {
      label: 'Radius restriction',
      detail: 'No competing flagship within 0.5 mi without consent',
      citation: 'p. 21',
    },
  ],
};

const MOCKS: Record<LeaseAnalysisSection, unknown> = {
  executiveIdentity: MOCK_EXECUTIVE_IDENTITY,
  financialStack: MOCK_FINANCIAL_STACK,
  criticalDeadlines: MOCK_CRITICAL_DEADLINES,
  operationalGuardrails: MOCK_OPERATIONAL_GUARDRAILS,
  legalNuances: MOCK_LEGAL_NUANCES,
};

export const STREAM_SECTION_ORDER: LeaseAnalysisSection[] = [
  'executiveIdentity',
  'financialStack',
  'criticalDeadlines',
  'operationalGuardrails',
  'legalNuances',
];

export function getMockForSection(section: LeaseAnalysisSection): unknown {
  return MOCKS[section];
}
