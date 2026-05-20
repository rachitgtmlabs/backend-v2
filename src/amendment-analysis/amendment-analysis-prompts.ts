/**
 * Amendment analysis prompts - modified to extract DELTA only.
 * For each section, we pass the previous version's JSON and ask for only changed values.
 */
import type { LeaseAnalysisSection } from '../lease-analysis/lease-analysis.mocks';

/**
 * System prompt for amendment analysis - emphasizes delta extraction
 */
export const AMENDMENT_ANALYSIS_SYSTEM_PROMPT = `You are an expert commercial real estate lease analyst specializing in lease amendments. The user message contains:
1. Raw OCR from an AMENDMENT PDF with page markers
2. The CURRENT effective lease values for one section (JSON from the original lease or prior amendments)
3. A task to identify ONLY what has CHANGED in this amendment

CRITICAL RULES:
- Your job is to extract the DELTA (changes only) from this amendment document.
- If a field's value in the amendment is THE SAME as the previous version, DO NOT include it in your response.
- Only include fields that have CHANGED or been ADDED by this amendment.
- If NO changes are found for a section, return an object with only empty structures matching the schema.
- Use empty strings "" and empty arrays [] for any fields you're including where the value is unclear.
- Ground answers in the OCR; do not invent parties, amounts, or dates not supported by the text.
- Put page / section / exhibit references in citation fields when inferable.
- When the schema includes a pageReference field, extract the page number from the [PAGE N] marker.
- Match JSON value types to the schema: any field typed as string must be a JSON string (quoted).`;

/**
 * Section-specific delta extraction prompts.
 * Each prompt instructs the model to compare against the previous version and extract only changes.
 */
export const AMENDMENT_SECTION_USER_TAIL: Record<LeaseAnalysisSection, string> = {
  executiveSummary: `Section: Executive Summary (DELTA EXTRACTION)

The amendment changes one or more facts in the original lease's executive summary. Produce a FRESH Markdown brief (200-350 words) reflecting the AMENDED state — incorporate the amendment's changes into headline economics, term & options, and what-to-watch.

STRUCTURE: One-paragraph identification, then \`### Headline economics\`, \`### Term & options\`, \`### What to watch\` (same as the original summary prompt). Use \`**bold**\` for any value the amendment changed so readers can spot deltas at a glance.

Set citation to the amendment page/section that drives the most material change. Ground every claim in the amendment + prior summary; do not invent.`,

  spaceAndPremises: `Section: Space & Premises (DELTA EXTRACTION)

Compare the amendment document against the PREVIOUS VALUES provided below. Extract ONLY fields that have CHANGED.

Common amendment changes to look for:
- Resized premises (areaRentable / areaUsable change)
- Added or removed storage cage
- Reallocated parking spaces (count or arrangement)
- Suite renumbering
- Common-area load adjustment

For any unchanged field, return its value field as "" with empty citation. Do not invent values.`,

  executiveIdentity: `Section: Executive Identity (DELTA EXTRACTION)

Compare the amendment document against the PREVIOUS VALUES provided below. Extract ONLY fields that have CHANGED.

Common amendment changes to look for:
- Changed tenant name (assignment/name change)
- Extended lease term (new leaseTo date)
- Changed square footage
- Changed base rent or rent per square foot
- Modified security deposit
- New or modified renewal options

If a field is unchanged from the previous version, DO NOT include it in your response.
If no changes are found, return an object with empty values matching the schema structure.`,

  financialStack: `Section: Financial Stack (DELTA EXTRACTION)

Compare the amendment document against the PREVIOUS VALUES provided below. Extract ONLY fields that have CHANGED.

Common amendment changes to look for:
- New or modified rent schedule rows (different amounts, dates, escalations)
- Changed summaryCards values (new total value, monthly payment, escalation %)
- Modified or new additional charges (CAM, taxes, insurance adjustments)
- Base year changes

For rentSchedule: if a new period is added or an existing period is modified, include it.
For additionalCharges: only include charges that are new or have changed values.
If no changes are found, return an object with empty values matching the schema structure.`,

  criticalDeadlines: `Section: Critical Deadlines (DELTA EXTRACTION)

Compare the amendment document against the PREVIOUS VALUES provided below. Extract ONLY fields that have CHANGED.

Common amendment changes to look for:
- New milestones (new dates, new obligations)
- Extended or modified existing deadlines
- Changed notice periods
- New or modified risk factors

For milestones: only include NEW milestones or ones with CHANGED dates/descriptions.
For risks: only include NEW risk assessments related to the amendment.
If no changes are found, return an object with empty milestones and risks arrays, and riskSummary with zero counts.`,

  operationalGuardrails: `Section: Operational Guardrails (DELTA EXTRACTION)

The schema is four structured provision topics: use, alterations, services, signs. Each topic has synopsis, keyParameters, narrative (with citation + pageReference + amendments) and a certainty level.

Compare the amendment against the PREVIOUS VALUES below. For each topic:
- If the amendment MODIFIES the rule, fill that topic's synopsis/keyParameters/narrative with the NEW post-amendment statement and add a concise entry to the relevant field's amendments[] array describing the change (e.g. "Amendment 2: HVAC after-hours fee raised to $75/hr").
- If the amendment is silent on a topic, return that topic with all field values as "" and certainty "low" (placeholder — the merger will keep the prior value).

Common amendment changes to look for:
- Expanded or restricted permitted uses, new exclusivity/radius language (use)
- Modified alteration consent thresholds or restoration obligations (alterations)
- New service hours, after-hours fees, security/janitorial changes (services)
- New signage rights or exterior alteration restrictions (signs)

If no changes are found at all, return all four topics with empty field values and certainty "low".`,

  legalNuances: `Section: Legal Nuances (DELTA EXTRACTION)

The schema is a riskRegister with counts, overallCertainty, and an array of sections containing issues (category, issueDescription, affectedClause, citation, pageReference, certaintyLevel, recommendedAction).

Compare the amendment against the PREVIOUS VALUES below. Extract ONLY:
- NEW issues introduced by the amendment language (e.g. amendment adds an exclusivity carve-out that is itself ambiguous)
- MODIFIED prior issues that are no longer accurate after the amendment (include the updated version)

For each new/changed issue, set affectedClause to the amendment's section reference and pageReference to the amendment PDF page. Group new issues under the appropriate existing section name where possible ("Assignment, Subletting & Transfer", "Default & Remedies", "Non-Standard & Special Clauses") so the merged register stays clean.

Populate counts as the delta of issues being ADDED at each certainty level (the merger will combine with prior counts).

If the amendment introduces no new legal-nuance issues, return riskRegister with counts {high:0, medium:0, low:0}, overallCertainty "low", and an empty sections array.`,
};

/**
 * CAM Review delta extraction prompt
 */
export const AMENDMENT_CAM_REVIEW_USER_TAIL = `Section: CAM Review (DELTA EXTRACTION)

Compare the amendment document against the PREVIOUS VALUES provided below. Extract ONLY NEW issues or CHANGED items.

Look for:
- New ambiguities introduced by the amendment
- Conflicts between amendment language and original lease
- New provisions that were missing before
- New tenant concerns raised by amendment terms
- New or modified CAM rules/clauses in the amendment

For each category (ambiguities, conflicts, missingProvisions, tenantConcerns):
- Only include items that are NEW or CHANGED by this amendment
- Do not repeat issues from the original lease that haven't changed

For camRules:
- Include only rules NEW or MATERIALLY CHANGED by this amendment
- Assign new ruleIds continuing from the previous highest (e.g. if previous ended at R-8, start at R-9)
- Use the same ruleCategory enum values as the base schema

For flagsAndObservations:
- Provide brief string-level notes only for NEW observations introduced by this amendment

For summary:
- Recalculate totalRulesExtracted as the combined count (previous + new delta rules)
- Update rulesByCategory counts to reflect added rules only
- Reassess overallTenantRiskAssessment based on the amendment's impact
- Update keyTenantProtections and keyTenantExposures to reflect any changes from this amendment

If no new CAM-related issues are found, return an object with empty arrays and zeroed counts.`;

/**
 * Build the user message with previous version context for delta extraction
 */
export function buildAmendmentUserContent(
  ocrPlainText: string,
  section: LeaseAnalysisSection,
  previousSectionJson: unknown,
): string {
  const tail = AMENDMENT_SECTION_USER_TAIL[section];
  const previousJsonStr = JSON.stringify(previousSectionJson, null, 2);
  
  return `${ocrPlainText}

---

PREVIOUS VERSION VALUES:
\`\`\`json
${previousJsonStr}
\`\`\`

---

${tail}`;
}

/**
 * Build CAM review user message with previous version context
 */
export function buildAmendmentCamReviewUserContent(
  ocrPlainText: string,
  previousCamJson: unknown,
): string {
  const previousJsonStr = JSON.stringify(previousCamJson, null, 2);
  
  return `${ocrPlainText}

---

PREVIOUS VERSION VALUES:
\`\`\`json
${previousJsonStr}
\`\`\`

---

${AMENDMENT_CAM_REVIEW_USER_TAIL}`;
}
