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
  executiveSummary:
    'Section: Executive Summary. Write a concise Markdown brief (200-350 words) summarizing this lease for a busy operator. ' +
    'STRUCTURE: Open with a one-paragraph identification sentence stating term length (years), lease type (office / retail / industrial / etc.), parties (Landlord + Tenant), and premises (suite, building, square footage). ' +
    'Then write THREE sub-sections using exactly these Markdown `###` headers in this order: ' +
    '"### Headline economics" (3-4 bullets: base rent + escalators, pass-through costs (CAM/taxes/insurance), security deposit, any other material money facts); ' +
    '"### Term & options" (2-3 bullets: commencement & expiration dates, renewal options, early-termination rights, expansion or ROFR options if any); ' +
    '"### What to watch" (3-4 bullets: the most operationally important risks, deadlines, or unusual clauses an operator should know — late-fee escalation, missing CAM cap, holdover penalty, restoration obligation, etc.). ' +
    'STYLE: Use `**bold**` for headline numbers and named clauses. Use plain `-` bullets (not numbered lists). Do NOT use headers other than `###`. Do NOT restate the schema fields. Do NOT write more than 350 words total. ' +
    'Set `citation` to the most relevant single page/section reference for the headline identification (e.g. "p. 1, preamble" or "p. 1, §1.1") — short only. ' +
    'Ground every claim in the OCR; if a fact (e.g. holdover) is not addressed in the lease, omit that bullet rather than invent.',

  spaceAndPremises:
    'Section: Space & Premises. Extract 13 structured fields describing the leased premises. ' +
    'Fields: unit (suite/unit number, e.g. "Suite 1200"); building (building name or address line, e.g. "450 Park Avenue" or "Tower A"); premises (one-sentence legal description of what is being leased); zipCode; city; state; areaRentable (e.g. "18,450 sq. ft." — include the unit); areaUsable; commonArea (load factor or common-area allocation, e.g. "7.3% load factor"); parking (value = allocation summary e.g. "4 unreserved spaces, included in rent"; type.value = arrangement e.g. "Covered garage, non-exclusive" or "Surface lot, reserved"); storageArea (e.g. "200 sq. ft. cage in basement"); status (occupancy/delivery status e.g. "Delivered turnkey" or "Shell with Tenant build-out"); notes (free-text caveats not covered above). ' +
    'For every field, populate citation, pageReference, and amendments (empty if none). Use "" for value when the lease is silent on the field — do NOT invent. Areas should preserve the unit (sq. ft., sf, rsf) exactly as the lease states.',

  executiveIdentity:
    'Section: Executive Identity. Extract ONLY the legal entity names for landlord/lessor (leaseFrom) and tenant/lessee (leaseTo) — return the company or person name only (e.g., "PH Office II, LLC" or "Northbrook Outfitters, Inc."), NOT descriptions, definitions, commencement date formulas, or explanatory text about them. Also extract property or suite, lease identifier, rentable area (square feet as number only), rent per square foot (rate only, e.g., "$52.00"), base rent description, security deposit (amount only in "amount" field, any conditions/notes in "conditions" field), and renewal/options language.',

  financialStack:
    'Section: Financial Stack. For summaryCards: return AT MOST 4 cards representing the most important financial metrics (e.g., Lease Term, Base Rent Year 1, Security Deposit, Annual Escalation). Each card has title (short label), numericValue (raw number ONLY — no currency symbols, no "months"/"years" text, no commas), valueUnit one of months|years|usd|percent|plain, and citation (short only, e.g. "p. 4" or "Art. 1"; never long legal prose; use "" if unknown). Use usd for dollar amounts as a number (76000 not "$76,000"). Use percent for displayed percent (4.65 means 4.65%). Prefer months for primary lease term length. For rentSchedule: monthlyRent and annualRent are strings in JSON (e.g. "$76,000" and "$912,000" or "76000" / "912000"); never output them as numeric literals. In rentSchedule "notes", write "Per square foot" in full (not "/sf" or "/psf" abbreviations). Also extract additionalCharges (CAM, taxes, insurance, etc.). ' +
    'For lateFees: extract the late-payment penalty structure. PRIMARY fee fields: graceDays (e.g. "5 days after due date"), percent (e.g. "5% of unpaid amount"), calculationType (the basis e.g. "Percentage of monthly base rent"). SECONDARY fee fields apply when the primary cure window expires: secondFeeGrace (e.g. "30 days after primary penalty"), secondFeePercent (e.g. "1.5% per month, compounded"), secondFeeCalculationType (e.g. "Compound monthly interest on outstanding balance"). PER-DAY: perDayFee (a daily flat fee that accrues after delinquency, e.g. "$50/day after 30 days delinquent"). For every field populate citation, pageReference, and amendments (empty if none). Use "" for value when a tier is silent in the lease — many leases have only the primary fee, in which case secondFee* and perDayFee values are "". Never invent a tiered structure not stated in the lease.',

  criticalDeadlines:
    'Section: Critical Deadlines. You MUST return a JSON object with exactly three properties: riskSummary (object with high/medium/low integer counts), milestones (array), and risks (array). For milestones: list material date-driven obligations with severity high|medium|low. CRITICAL DATE FORMAT: The "date" field MUST be an actual date in YYYY-MM-DD format (e.g., "2025-06-01") whenever a specific date is stated or can be calculated from the lease. If the lease states a relative formula (e.g., "210 days after execution") AND an execution/effective date is also stated, calculate and return the actual date. Only use a short description (max 50 chars) as a last resort when no date can be determined. Never return long explanatory text in the date field. For riskSummary: count the number of milestones at each severity level (e.g., if you have 5 high-severity milestones, set riskSummary.high to 5). For risks: provide deviation and risk analysis cards—each needs severity critical|high|medium|low (use critical for statutory exposure or severe market deviation), title, contextSummary (short lease fact), sectionReference (e.g. "Section 4.2"), analysisText (why it matters / statute or exposure), citation, and pageReference. If no deviations found, risks must be an empty array [].',

  operationalGuardrails:
    'Section: Operational Guardrails. Produce structured per-topic provisions across 24 topics. For EACH topic populate three fields exactly: ' +
    '(1) synopsis.value — one plain-English sentence (<=140 chars) capturing the rule; ' +
    '(2) keyParameters.value — a short newline-separated list of concrete, quantitative or rule-level parameters (thresholds, dollar caps, business-hour ranges, approval timelines, day counts, percentages, named systems). Format as "Label: value" pairs, one per line. Use "" if no quantitative parameters exist; ' +
    '(3) narrative.value — a 2-4 sentence operator-facing explanation: WHO must do WHAT, with WHICH consents/exceptions, and the practical operational consequence. Avoid restating the synopsis verbatim. ' +
    'Topic scope (all 24): ' +
    'use = permitted vs. prohibited uses, exclusivity, radius restrictions; ' +
    'alterations = tenant alterations / improvements, consent thresholds, removal & restoration; ' +
    'services = building services (HVAC, janitorial, security, elevators), hours of operation, after-hours fees, utility metering; ' +
    'signs = signage rights, building-standard requirements, exterior alterations; ' +
    'premisesAndTerm = lease term length, commencement, delivery condition, expiration; ' +
    'holdover = holdover rent multiplier, conversion to month-to-month, Landlord remedies; ' +
    'expansionAndRelocation = expansion options, ROFO on adjacent space, Landlord relocation rights; ' +
    'rightOfFirstRefusalOffer = ROFR/ROFO on building sale or transfer; ' +
    'taxes = property tax pass-through, pro-rata share, base year, reassessment; ' +
    'operatingExpenses = CAM definition, reconciliation, caps, audit rights, gross-up, management fee; ' +
    'insurance = required policy limits, additional insureds, waiver of subrogation; ' +
    'brokerage = named brokers, commission obligations, mutual indemnity; ' +
    'repairsAndMaintenance = Landlord-vs-Tenant repair split, response times; ' +
    'parking = allocation, reserved/unreserved, pricing, visitor parking; ' +
    'hazardousMaterials = prohibited substances, disclosure, indemnity, pre-existing conditions; ' +
    'rulesAndRegulations = building rules, Landlord right to amend, enforcement; ' +
    'landlordsRightOfEntry = access purposes, advance notice, emergencies, showings; ' +
    'quietEnjoyment = quiet-enjoyment covenant, constructive eviction; ' +
    'assignmentAndSubletting = consent standard, permitted transfers, profit share, recapture; ' +
    'defaultAndRemedies = cure periods, acceleration, eviction, re-letting, mitigation, jury-trial waiver; ' +
    'landlordDefault = Landlord cure period, Tenant self-help, offset, damage caps; ' +
    'casualty = repair election, abatement, termination thresholds; ' +
    'condemnation = total vs partial taking, award allocation, termination rights; ' +
    'liabilityAndIndemnification = scope of mutual indemnities, gross-negligence carve-outs; ' +
    'liens = mechanics-lien prohibition, bonding, statutory waivers; ' +
    'notices = permitted delivery methods, notice addresses, effective dates; ' +
    'estoppel = response window, deemed approval, SNDA cooperation; ' +
    'subordination = subordination to existing/future mortgages, non-disturbance, attornment. ' +
    'For every field populate citation, pageReference, and amendments (empty if none). Set topic-level certainty: "high" only when the OCR directly states the rule, "medium" when inferred from related clauses, "low" when the OCR is silent or ambiguous. ' +
    'CRITICAL: When the lease is SILENT on a topic (e.g. no ROFR clause anywhere, no holdover provision), still include the topic in the response but set ALL field values (synopsis.value, keyParameters.value, narrative.value) to empty strings "" and certainty to "low". The backend will prune such topics before delivery. NEVER invent parameters.',

  legalNuances:
    'Section: Legal Nuances. Produce an audit-style RISK REGISTER flagging items that require human legal review. Return riskRegister with three sub-fields: counts, overallCertainty, sections. ' +
    'Organize issues into AT LEAST these three sections (add more only if material): ' +
    '"Assignment, Subletting & Transfer", "Default & Remedies", "Non-Standard & Special Clauses" (radius, exclusivity, ROFO/ROFR, co-tenancy, holdover, kick-out, hazardous materials, indemnity carve-outs, etc.). ' +
    'For EACH issue, populate: ' +
    'category (one of: Ambiguity, Conflict, Risk, Subjectivity, Missing Exhibit, Dependency, Non-Standard, Inconsistency); ' +
    'issueDescription (1-2 concise sentences naming the specific concern); ' +
    'affectedClause (the lease section identifier, e.g. "Section 8.1 Consent to Assignment"); ' +
    'citation (short, e.g. "p. 18" or "p. 18, §8.1"); pageReference; ' +
    'certaintyLevel (high = clearly stated in OCR, medium = inferred, low = ambiguous OCR); ' +
    'recommendedAction (a concrete next step for the legal reviewer — e.g. "Negotiate cap on landlord consent timeline" or "Confirm exhibit B is attached"). ' +
    'Populate counts as the integer total of issues at each certaintyLevel across all sections (e.g. count.high = number of high-certainty issues). overallCertainty = the model\'s overall confidence in the register. ' +
    'If a section has no issues, still include it with an empty issues array. NEVER invent issues without OCR grounding.',
};
