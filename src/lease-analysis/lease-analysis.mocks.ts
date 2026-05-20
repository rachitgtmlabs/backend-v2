/** Mock payloads for streaming lease analysis (replace with real extraction later). */

export type LeaseAnalysisSection =
  | 'executiveSummary'
  | 'executiveIdentity'
  | 'spaceAndPremises'
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

export const MOCK_EXECUTIVE_SUMMARY = {
  value: `This **10-year office lease** is between Hudson Realty Holdings LLC (Landlord) and Northwind Analytics Inc. (Tenant) for **Suite 1200, 450 Park Avenue**, an 18,450 rentable-sf premises.

### Headline economics
- Base rent starts at **$52.00 / rsf / year (~$79,950 / month)**.
- Security deposit: **$239,850 (3 months)**.

### Term & options
- Two (2) successive **5-year renewal options** at fair market value.

### What to watch
- Confirm renewal-notice mechanics and FMV reset methodology before exercising.`,
  citation: 'p. 1, preamble',
};

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

function pageRef(page: number, section: string, highlightText = '') {
  return { page, section, highlightText };
}

function spaceField(value: string, citation: string, page = 0, section = '') {
  return {
    value,
    citation,
    pageReference: pageRef(page, section),
    amendments: [] as string[],
  };
}

export const MOCK_SPACE_AND_PREMISES = {
  unit: spaceField('Suite 1200', 'p. 2, §1.1', 2, '§1.1'),
  building: spaceField('450 Park Avenue', 'p. 2, §1.1', 2, '§1.1'),
  premises: spaceField(
    'Suite 1200, comprising 18,450 rentable sq. ft. on the 12th floor of 450 Park Avenue.',
    'p. 2, Exhibit A',
    2,
    'Exhibit A',
  ),
  zipCode: spaceField('10022', 'p. 2, §1.1', 2, '§1.1'),
  city: spaceField('New York', 'p. 2, §1.1', 2, '§1.1'),
  state: spaceField('New York', 'p. 2, §1.1', 2, '§1.1'),
  areaRentable: spaceField('18,450 sq. ft.', 'p. 3, §2.2', 3, '§2.2'),
  areaUsable: spaceField('17,200 sq. ft.', 'p. 3, §2.2', 3, '§2.2'),
  commonArea: spaceField('7.3% load factor', 'p. 3, §2.2', 3, '§2.2'),
  parking: {
    value: '4 unreserved spaces, included in rent',
    citation: 'p. 14, §11.2',
    pageReference: pageRef(14, '§11.2'),
    amendments: [] as string[],
    type: spaceField('Covered garage, non-exclusive', 'p. 14, §11.2', 14, '§11.2'),
  },
  storageArea: spaceField('', '', 0, ''),
  status: spaceField('Delivered turnkey', 'p. 4, §3.1', 4, '§3.1'),
  notes: spaceField('', '', 0, ''),
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
  lateFees: {
    calculationType: spaceField(
      'Percentage of monthly base rent',
      'p. 8, §5.4',
      8,
      '§5.4',
    ),
    graceDays: spaceField('5 days after due date', 'p. 8, §5.4', 8, '§5.4'),
    percent: spaceField('5% of unpaid amount', 'p. 8, §5.4', 8, '§5.4'),
    secondFeeCalculationType: spaceField(
      'Compound monthly interest on outstanding balance',
      'p. 8, §5.4(b)',
      8,
      '§5.4(b)',
    ),
    secondFeeGrace: spaceField(
      '30 days after primary penalty assessed',
      'p. 8, §5.4(b)',
      8,
      '§5.4(b)',
    ),
    secondFeePercent: spaceField(
      '1.5% per month, compounded',
      'p. 8, §5.4(b)',
      8,
      '§5.4(b)',
    ),
    perDayFee: spaceField(
      '$50 per day after 30 days delinquent',
      'p. 9, §5.4(c)',
      9,
      '§5.4(c)',
    ),
  },
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

function pField(
  value: string,
  citation: string,
  page: number,
  section: string,
  highlightText = '',
  amendments: string[] = [],
) {
  return {
    value,
    citation,
    pageReference: { page, section, highlightText },
    amendments,
  };
}

export const MOCK_OPERATIONAL_GUARDRAILS = {
  use: {
    synopsis: pField(
      'Office and ancillary business uses only; no manufacturing, retail, or food service.',
      'p. 14, §6.1',
      14,
      '§6.1',
      'Tenant shall use the Premises',
    ),
    keyParameters: pField(
      'Permitted use: General office\nProhibited: Retail, manufacturing, food service, medical\nChange of use: Landlord written consent (60 days)',
      'p. 14, §6.1–6.2',
      14,
      '§6.1',
    ),
    narrative: pField(
      "Tenant's use is strictly limited to general office and directly related ancillary purposes. Any change of use requires Landlord's prior written consent on 60 days' notice; Landlord may withhold consent in its reasonable discretion. Continued non-compliant use is a non-monetary default after a 30-day cure window.",
      'p. 14, §6.1; p. 15, §6.3',
      14,
      '§6.1',
    ),
    certainty: 'high',
  },
  alterations: {
    synopsis: pField(
      'Non-structural alterations under $25k allowed with notice; everything else needs landlord consent.',
      'p. 16, §7.2',
      16,
      '§7.2',
    ),
    keyParameters: pField(
      'Notice-only threshold: $25,000 (non-structural)\nLandlord consent: required above threshold\nStructural alterations: never permitted\nRestoration on surrender: at Landlord election',
      'p. 16, §7.2; p. 17, §7.4',
      16,
      '§7.2',
    ),
    narrative: pField(
      'Tenant may perform non-structural alterations valued under $25,000 with 10 business days written notice. Above the threshold or anything structural requires Landlord consent (not to be unreasonably withheld for non-structural work). On surrender, Landlord may elect — at its sole discretion — to require removal and restoration to base-building condition, which can materially affect end-of-term cost.',
      'p. 16, §7.2; p. 17, §7.4; p. 24, §11.6',
      16,
      '§7.2',
    ),
    certainty: 'high',
  },
  services: {
    synopsis: pField(
      'HVAC and elevators during business hours; janitorial 5x/week; after-hours services billed at tenant cost.',
      'p. 19, §9.1',
      19,
      '§9.1',
    ),
    keyParameters: pField(
      'HVAC hours: Mon–Fri 8a–6p, Sat 9a–1p\nAfter-hours HVAC: $65 / hour / zone\nJanitorial: 5 nights / week, Class A spec\nElevators: 24/7, one service car after hours\nUtility metering: submetered electricity',
      'p. 19, §9.1; p. 20, §9.4',
      19,
      '§9.1',
    ),
    narrative: pField(
      'Building services are delivered to Class A standard during stated business hours. After-hours HVAC is provided on request at the published rate, billed monthly as additional rent. Interruption of services for more than 5 consecutive business days triggers rent abatement under §9.5.',
      'p. 19, §9.1–9.5',
      19,
      '§9.1',
    ),
    certainty: 'high',
  },
  signs: {
    synopsis: pField(
      'Building-standard suite signage only; exterior and lobby signs require landlord approval.',
      'p. 22, §10.3',
      22,
      '§10.3',
    ),
    keyParameters: pField(
      'Suite identification: building standard, landlord-provided\nLobby directory: one line included\nExterior / monument: landlord written approval required\nNon-conforming signs: removed at tenant cost',
      'p. 22, §10.3',
      22,
      '§10.3',
    ),
    narrative: pField(
      'Tenant receives one line on the lobby directory and a building-standard suite plaque at Landlord cost. Any signage beyond that — exterior, monument, window graphics — requires Landlord written approval and conformance with the Shopping Center sign criteria. Signs installed without approval may be removed by Landlord with the cost charged back to Tenant.',
      'p. 22, §10.3; p. 23, §10.5',
      22,
      '§10.3',
    ),
    certainty: 'medium',
  },
};

export const MOCK_LEGAL_NUANCES = {
  riskRegister: {
    counts: { high: 3, medium: 2, low: 1 },
    overallCertainty: 'medium',
    sections: [
      {
        sectionName: 'Assignment, Subletting & Transfer',
        issues: [
          {
            category: 'Subjectivity',
            issueDescription:
              "Landlord consent to assignment 'shall not be unreasonably withheld,' but the consent criteria include subjective assessments of the assignee's financial resources and operating experience.",
            affectedClause: 'Section 8.1 Consent to Assignment',
            citation: 'p. 18, §8.1',
            pageReference: { page: 18, section: '§8.1', highlightText: 'shall not be unreasonably' },
            certaintyLevel: 'high',
            recommendedAction:
              'Negotiate objective consent standards (e.g. minimum net worth multiple) and a 15-business-day deemed-approval window.',
          },
          {
            category: 'Risk',
            issueDescription:
              'Landlord retains a recapture right on any proposed assignment or sublet of more than 50% of the premises, allowing Landlord to terminate the lease in lieu of consenting.',
            affectedClause: 'Section 8.2 Recapture',
            citation: 'p. 19, §8.2',
            pageReference: { page: 19, section: '§8.2', highlightText: 'Landlord may, at its option' },
            certaintyLevel: 'high',
            recommendedAction:
              "Carve out permitted transfers to affiliates and successor entities from Landlord's recapture right.",
          },
        ],
      },
      {
        sectionName: 'Default & Remedies',
        issues: [
          {
            category: 'Risk',
            issueDescription:
              "Monetary default cure period is only 5 business days after notice; non-monetary defaults have a 30-day cure period that runs even where the default is not curable within 30 days.",
            affectedClause: 'Section 12.1 Events of Default',
            citation: 'p. 24, §12.1',
            pageReference: { page: 24, section: '§12.1', highlightText: 'If Tenant fails to pay' },
            certaintyLevel: 'high',
            recommendedAction:
              'Extend monetary cure to 10 business days and add a "longer reasonable period" qualifier for non-monetary defaults that cannot be cured in 30 days.',
          },
          {
            category: 'Ambiguity',
            issueDescription:
              "Lease references 'all remedies available at law or in equity' without enumerating any cap on Landlord's recovery of accelerated rent.",
            affectedClause: 'Section 12.3 Remedies',
            citation: 'p. 25, §12.3',
            pageReference: { page: 25, section: '§12.3', highlightText: 'all remedies available' },
            certaintyLevel: 'medium',
            recommendedAction:
              'Add an express mitigation obligation on Landlord and cap accelerated rent at present value.',
          },
        ],
      },
      {
        sectionName: 'Non-Standard & Special Clauses',
        issues: [
          {
            category: 'Non-Standard',
            issueDescription:
              "Half-mile radius restriction prevents Tenant or any affiliate from operating a competing flagship within 0.5 miles of the premises during the term.",
            affectedClause: 'Section 14.4 Radius Restriction',
            citation: 'p. 27, §14.4',
            pageReference: { page: 27, section: '§14.4', highlightText: 'within one-half (1/2) mile' },
            certaintyLevel: 'high',
            recommendedAction:
              'Confirm scope of "affiliate"; carve out existing locations and online sales; consider sunset on radius after Year 5.',
          },
          {
            category: 'Missing Exhibit',
            issueDescription:
              'Exhibit C "Permitted Encumbrances" is referenced in §3.1 but not attached to the version under review.',
            affectedClause: 'Section 3.1 Title; Exhibit C',
            citation: 'p. 6, §3.1',
            pageReference: { page: 6, section: '§3.1', highlightText: 'subject to the matters' },
            certaintyLevel: 'medium',
            recommendedAction:
              'Obtain and review Exhibit C before signing; confirm no encumbrance materially impairs Tenant\'s use.',
          },
          {
            category: 'Subjectivity',
            issueDescription:
              "Right-of-First-Offer (ROFO) on adjacent suite is exercisable only if Tenant is 'in good standing' — undefined term.",
            affectedClause: 'Section 15.2 ROFO',
            citation: 'p. 29, §15.2',
            pageReference: { page: 29, section: '§15.2', highlightText: 'in good standing' },
            certaintyLevel: 'low',
            recommendedAction:
              'Define "good standing" as "no uncured monetary default" to avoid forfeiture on minor or alleged breaches.',
          },
        ],
      },
    ],
  },
};

const MOCKS: Record<LeaseAnalysisSection, unknown> = {
  executiveSummary: MOCK_EXECUTIVE_SUMMARY,
  executiveIdentity: MOCK_EXECUTIVE_IDENTITY,
  spaceAndPremises: MOCK_SPACE_AND_PREMISES,
  financialStack: MOCK_FINANCIAL_STACK,
  criticalDeadlines: MOCK_CRITICAL_DEADLINES,
  operationalGuardrails: MOCK_OPERATIONAL_GUARDRAILS,
  legalNuances: MOCK_LEGAL_NUANCES,
};

// executiveSummary streams first so the operator sees the narrative recap
// while later sections are still extracting. spaceAndPremises follows the
// identity section since it lives in the same Tab 1.
export const STREAM_SECTION_ORDER: LeaseAnalysisSection[] = [
  'executiveSummary',
  'executiveIdentity',
  'spaceAndPremises',
  'financialStack',
  'criticalDeadlines',
  'operationalGuardrails',
  'legalNuances',
];

export function getMockForSection(section: LeaseAnalysisSection): unknown {
  return MOCKS[section];
}
