/**
 * Per-section text placed AFTER the OCR body in the user message (after "---").
 * Keep tails short: JSON shape is enforced by Groq Structured Outputs (see
 * lease-analysis-json-schemas.ts), not repeated here — avoids token bloat and
 * keeps the shared OCR prefix stable for prompt caching.
 *
 * Each API request is single-turn only: [system, user] — no assistant history,
 * so prior sections' JSON outputs are never injected into later calls.
 */
import type { LeaseAnalysisSection } from './lease-analysis.mocks';

/**
 * Identical on every section call. Output shape is defined by the API
 * json_schema for that section; focus here on extraction behavior.
 */
export const LEASE_ANALYSIS_SYSTEM_PROMPT = `You are an expert commercial real estate lease analyst. The user message starts with raw OCR from one lease PDF with page markers (e.g., [PAGE 1], [PAGE 2]), then "---", then a short task for a single abstract section.

Rules:
- Fill the response to match the response schema exactly (Structured Outputs).
- Use empty strings "" and empty arrays [] where the OCR does not support a value.
- Put page / section / exhibit references in citation fields when inferable; otherwise "". Reference pages by their number from the [PAGE N] markers (e.g., "p. 1, §1.1" or "p. 3").
- When the schema includes a pageReference field, extract the page number from the [PAGE N] marker where the information was found, and populate highlightText with the verbatim first 3-5 words of the sentence or clause at that location exactly as it appears in the OCR text (use "" if the location is unclear).
- amendments arrays contain strings (may be empty).
- Ground answers in the OCR; do not invent parties, amounts, or dates not supported by the text.
- Match JSON value types to the schema: any field typed as string must be a JSON string (quoted). Never emit bare numeric literals for string-typed fields (e.g. rent schedule amounts must be strings, not numbers).`;

/** Brief task lines only — schema lives in LEASE_ANALYSIS_JSON_SCHEMA. */
export const SECTION_USER_TAIL: Record<LeaseAnalysisSection, string> = {
  executiveIdentity:
    'Section: Executive Identity. Extract ONLY the legal entity names for landlord/lessor (leaseFrom) and tenant/lessee (leaseTo) — return the company or person name only (e.g., "PH Office II, LLC" or "Northbrook Outfitters, Inc."), NOT descriptions, definitions, commencement date formulas, or explanatory text about them. Also extract property or suite, lease identifier, rentable area (square feet as number only), rent per square foot (rate only, e.g., "$52.00"), base rent description, security deposit (amount only in "amount" field, any conditions/notes in "conditions" field), and renewal/options language.',

  financialStack:
    'Section: Financial Stack. For summaryCards: return AT MOST 4 cards representing the most important financial metrics (e.g., Lease Term, Base Rent Year 1, Security Deposit, Annual Escalation). Each card has title (short label), numericValue (raw number ONLY — no currency symbols, no "months"/"years" text, no commas), valueUnit one of months|years|usd|percent|plain, and citation (short only, e.g. "p. 4" or "Art. 1"; never long legal prose; use "" if unknown). Use usd for dollar amounts as a number (76000 not "$76,000"). Use percent for displayed percent (4.65 means 4.65%). Prefer months for primary lease term length. For rentSchedule: monthlyRent and annualRent are strings in JSON (e.g. "$76,000" and "$912,000" or "76000" / "912000"); never output them as numeric literals. In rentSchedule "notes", write "Per square foot" in full (not "/sf" or "/psf" abbreviations). Also extract additionalCharges (CAM, taxes, insurance, etc.).',

  criticalDeadlines:
    'Section: Critical Deadlines. You MUST return a JSON object with exactly three properties: riskSummary (object with high/medium/low integer counts), milestones (array), and risks (array). For milestones: list material date-driven obligations with severity high|medium|low. CRITICAL DATE FORMAT: The "date" field MUST be an actual date in YYYY-MM-DD format (e.g., "2025-06-01") whenever a specific date is stated or can be calculated from the lease. If the lease states a relative formula (e.g., "210 days after execution") AND an execution/effective date is also stated, calculate and return the actual date. Only use a short description (max 50 chars) as a last resort when no date can be determined. Never return long explanatory text in the date field. For riskSummary: count the number of milestones at each severity level (e.g., if you have 5 high-severity milestones, set riskSummary.high to 5). For risks: provide deviation and risk analysis cards—each needs severity critical|high|medium|low (use critical for statutory exposure or severe market deviation), title, contextSummary (short lease fact), sectionReference (e.g. "Section 4.2"), analysisText (why it matters / statute or exposure), citation, and pageReference. If no deviations found, risks must be an empty array [].',

  operationalGuardrails:
    'Section: Operational Guardrails. Capture permitted/prohibited uses, alteration and improvement rules, and stated building services (HVAC, janitorial, hours, etc.).',

  legalNuances:
    'Section: Legal Nuances. Summarize assignment, subletting, and transfer provisions; default and remedy mechanics; and notable non-standard clauses (e.g. radius, exclusivity, ROFO).',
};
