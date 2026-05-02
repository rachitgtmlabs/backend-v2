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
export const LEASE_ANALYSIS_SYSTEM_PROMPT = `You are an expert commercial real estate lease analyst. The user message starts with raw OCR from one lease PDF, then "---", then a short task for a single abstract section.

Rules:
- Fill the response to match the response schema exactly (Structured Outputs).
- Use empty strings "" and empty arrays [] where the OCR does not support a value.
- Put page / section / exhibit references in citation fields when inferable; otherwise "".
- amendments arrays contain strings (may be empty).
- Ground answers in the OCR; do not invent parties, amounts, or dates not supported by the text.`;

/** Brief task lines only — schema lives in LEASE_ANALYSIS_JSON_SCHEMA. */
export const SECTION_USER_TAIL: Record<LeaseAnalysisSection, string> = {
  executiveIdentity:
    'Section: Executive Identity. Extract landlord/lessor, tenant/lessee, property or suite, lease identifier, rentable area, base rent description, security deposit, and renewal/options language.',

  financialStack:
    'Section: Financial Stack. Extract headline financial KPIs as summary cards, any stepped rent or schedule rows, and separate line items for CAM, taxes, insurance, or other recurring charges.',

  criticalDeadlines:
    'Section: Critical Deadlines. List material date-driven obligations as milestones with severity. Set riskSummary counts so they match the number of milestones at each severity level.',

  operationalGuardrails:
    'Section: Operational Guardrails. Capture permitted/prohibited uses, alteration and improvement rules, and stated building services (HVAC, janitorial, hours, etc.).',

  legalNuances:
    'Section: Legal Nuances. Summarize assignment, subletting, and transfer provisions; default and remedy mechanics; and notable non-standard clauses (e.g. radius, exclusivity, ROFO).',
};
