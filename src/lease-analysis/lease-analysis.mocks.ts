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
    { title: 'Total Contract Value', value: '$1,425,800.00' },
    { title: 'Current Monthly Payment', value: '$12,450' },
    {
      title: 'Next Rent Escalation',
      value: '3%',
      subtext: 'October 1, 2026',
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
    },
    {
      title: 'First escalation window',
      date: '2026-10-01',
      severity: 'medium',
      citation: 'p. 8',
    },
    {
      title: 'Insurance certificate renewal',
      date: 'Annually by Jan 15',
      severity: 'medium',
      citation: 'p. 22',
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
