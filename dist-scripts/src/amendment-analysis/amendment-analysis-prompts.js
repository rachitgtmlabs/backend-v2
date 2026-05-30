"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMENDMENT_CAM_REVIEW_USER_TAIL = exports.AMENDMENT_OPERATIONAL_GUARDRAILS_B_TAIL = exports.AMENDMENT_OPERATIONAL_GUARDRAILS_A_TAIL = exports.AMENDMENT_SECTION_USER_TAIL = exports.AMENDMENT_ANALYSIS_SYSTEM_PROMPT = void 0;
exports.buildAmendmentUserContent = buildAmendmentUserContent;
exports.buildAmendmentOperationalGuardrailsUserContent = buildAmendmentOperationalGuardrailsUserContent;
exports.buildAmendmentCamReviewUserContent = buildAmendmentCamReviewUserContent;
exports.AMENDMENT_ANALYSIS_SYSTEM_PROMPT = `You are an expert commercial real estate lease analyst specializing in lease amendments. The user message contains:
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
exports.AMENDMENT_SECTION_USER_TAIL = {
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

Compare the amendment document against the PREVIOUS VALUES provided below. The schema requires ALL nine \`leaseInformation\` fields to be present in your response — \`lease\`, \`property\`, \`leaseFrom\`, \`leaseTo\`, \`squareFeet\`, \`rentPerSqFt\`, \`baseRent\`, \`securityDeposit\`, \`renewalOptions\`. You MUST include every one.

For each field:
- If the amendment CHANGES it, populate \`value\` (and \`amount\`/\`conditions\` for \`securityDeposit\`) with the NEW post-amendment value, set \`citation\` to the amendment page/section, and fill \`pageReference\` from the amendment's [PAGE N] marker.
- If the amendment is SILENT on that field, you MUST still include it with \`value: ""\` (or \`amount: ""\`, \`conditions: ""\` for \`securityDeposit\`), \`citation: ""\`, \`pageReference: { page: 0, section: "", highlightText: "" }\`, and \`amendments: []\`. The frontend merger treats empty values as "no change" and keeps the prior value.

Common amendment changes to look for:
- Changed tenant name (assignment/name change) → \`leaseTo\`
- Extended lease term → new \`leaseTo\` date
- Changed square footage → \`squareFeet\`
- Changed base rent or rent per square foot → \`baseRent\`, \`rentPerSqFt\`
- Modified security deposit → \`securityDeposit\`
- New or modified renewal options → \`renewalOptions\`

NEVER omit a field — every one of the nine must be a key in your response, even if empty.`,
    financialStack: `Section: Financial Stack (DELTA EXTRACTION)

The schema requires ALL four top-level keys to be present: \`summaryCards\`, \`rentSchedule\`, \`additionalCharges\`, \`lateFees\`. You MUST include every one.

Compare the amendment against the PREVIOUS VALUES provided below.

- \`summaryCards\`: include only cards whose values the amendment CHANGES (still capped at 4). If the amendment changes none, return \`[]\`.
- \`rentSchedule\`: include only periods that the amendment ADDS or MODIFIES. Empty array if no changes.
- \`additionalCharges\`: include only charges that are NEW or have CHANGED values. Empty array if none.
- \`lateFees\`: this is an OBJECT with 7 required leaseFields (\`calculationType\`, \`graceDays\`, \`percent\`, \`secondFeeCalculationType\`, \`secondFeeGrace\`, \`secondFeePercent\`, \`perDayFee\`). The whole object MUST be in your response — never omit it. For each of the 7 fields:
  - If the amendment CHANGES the late-fee rule, populate \`value\` with the new value, set \`citation\` and \`pageReference\` from the amendment, and add an entry to \`amendments\`.
  - If the amendment is SILENT on that field, include it with \`value: ""\`, \`citation: ""\`, \`pageReference: { page: 0, section: "", highlightText: "" }\`, \`amendments: []\`. The frontend merger treats empty values as "no change" and keeps the prior value.

Common amendment changes to look for:
- New or modified rent schedule rows (different amounts, dates, escalations)
- Changed summaryCards values (new total value, monthly payment, escalation %)
- Modified or new additional charges (CAM, taxes, insurance adjustments)
- Late-fee penalty changes (grace period, percent, per-day fee)
- Base year changes`,
    criticalDeadlines: `Section: Critical Deadlines (DELTA EXTRACTION)

The schema requires ALL three top-level keys to be present in your response: \`riskSummary\`, \`milestones\`, \`risks\`. You MUST include every one — never omit a key.

Compare the amendment against the PREVIOUS VALUES provided below.

- \`milestones\`: array — include only NEW milestones or ones whose date/severity the amendment CHANGES. Empty array \`[]\` if no changes.
- \`risks\`: array — include only NEW risk cards introduced by the amendment. Empty array \`[]\` if none.
- \`riskSummary\`: object with required integer fields \`high\`, \`medium\`, \`low\`. Count the items in your delta \`milestones\` array at each severity level. If \`milestones\` is empty, set all three to \`0\`. Always include the object with all three keys.

Common amendment changes to look for:
- New milestones (new dates, new obligations)
- Extended or modified existing deadlines
- Changed notice periods
- New or modified risk factors`,
    operationalGuardrails: `Section: Operational Guardrails (DELTA EXTRACTION)

The schema requires all 28 provision topics to be present in the response. Each topic has synopsis, keyParameters, narrative (each with value + citation + pageReference + amendments) and a topic-level certainty.

Topic scope (all 28 — every one MUST appear in your response):
use, alterations, services, signs, premisesAndTerm, holdover, expansionAndRelocation, rightOfFirstRefusalOffer, taxes, operatingExpenses, insurance, brokerage, repairsAndMaintenance, parking, hazardousMaterials, rulesAndRegulations, landlordsRightOfEntry, quietEnjoyment, assignmentAndSubletting, defaultAndRemedies, landlordDefault, casualty, condemnation, liabilityAndIndemnification, liens, notices, estoppel, subordination.

Compare the amendment against the PREVIOUS VALUES below. For each topic:
- If the amendment MODIFIES the rule, fill that topic's synopsis/keyParameters/narrative value fields with the NEW post-amendment statement, set certainty to "high" or "medium" as appropriate, and add a concise entry to the relevant field's amendments[] array describing the change (e.g. "Amendment 2: HVAC after-hours fee raised to $75/hr").
- If the amendment is SILENT on a topic, you MUST still include the topic with ALL value fields set to "" (empty string) and certainty "low". This is a placeholder — the server will prune it and the merger will keep the prior value. Do NOT omit any topic.

Common amendment changes to look for:
- Expanded or restricted permitted uses, new exclusivity/radius language (use)
- Modified alteration consent thresholds or restoration obligations (alterations)
- New service hours, after-hours fees, security/janitorial changes (services)
- New signage rights or exterior alteration restrictions (signs)
- Term extensions/renewals (premisesAndTerm), expansion or relocation rights (expansionAndRelocation)
- Tax/CAM/insurance pass-through changes (taxes, operatingExpenses, insurance)
- Parking, assignment, default, casualty/condemnation, indemnity adjustments
- Updated notice addresses (notices), new estoppel/subordination requirements

CRITICAL: All 28 topics MUST appear as keys in your JSON response. If no changes are found at all, return every topic with empty value strings and certainty "low".`,
    legalNuances: `Section: Legal Nuances (DELTA EXTRACTION)

The schema is a riskRegister with counts, overallCertainty, and an array of sections containing issues (category, issueDescription, affectedClause, citation, pageReference, certaintyLevel, recommendedAction).

Compare the amendment against the PREVIOUS VALUES below. Extract ONLY:
- NEW issues introduced by the amendment language (e.g. amendment adds an exclusivity carve-out that is itself ambiguous)
- MODIFIED prior issues that are no longer accurate after the amendment (include the updated version)

For each new/changed issue, set affectedClause to the amendment's section reference and pageReference to the amendment PDF page. Group new issues under the appropriate existing section name where possible ("Assignment, Subletting & Transfer", "Default & Remedies", "Non-Standard & Special Clauses") so the merged register stays clean.

Populate counts as the delta of issues being ADDED at each certainty level (the merger will combine with prior counts).

If the amendment introduces no new legal-nuance issues, return riskRegister with counts {high:0, medium:0, low:0}, overallCertainty "low", and an empty sections array.`,
};
exports.AMENDMENT_OPERATIONAL_GUARDRAILS_A_TAIL = `Section: Operational Guardrails (Part A — 14 topics: DELTA EXTRACTION)

Compare the amendment against the PREVIOUS VALUES below. For each topic:
- If the amendment MODIFIES the rule, fill that topic's synopsis/keyParameters/narrative with the NEW post-amendment statement and add a concise entry to the relevant field's amendments[] array describing the change (e.g. "Amendment 2: HVAC after-hours fee raised to $75/hr").
- If the amendment is silent on a topic, return that topic with all field values as "" and certainty "low" (placeholder — the merger will keep the prior value).

Topic scope (these 14 only):
- use = permitted vs. prohibited uses, exclusivity, radius restrictions;
- alterations = tenant alterations / improvements, consent thresholds, removal & restoration;
- services = building services (HVAC, janitorial, security, elevators), hours of operation, after-hours fees, utility metering;
- signs = signage rights, building-standard requirements, exterior alterations;
- premisesAndTerm = lease term length, commencement, delivery condition, expiration;
- holdover = holdover rent multiplier, conversion to month-to-month, Landlord remedies;
- expansionAndRelocation = expansion options, ROFO on adjacent space, Landlord relocation rights;
- rightOfFirstRefusalOffer = ROFR/ROFO on building sale or transfer;
- taxes = property tax pass-through, pro-rata share, base year, reassessment;
- operatingExpenses = CAM definition, reconciliation, caps, audit rights, gross-up, management fee;
- insurance = required policy limits, additional insureds, waiver of subrogation;
- brokerage = named brokers, commission obligations, mutual indemnity;
- repairsAndMaintenance = Landlord-vs-Tenant repair split, response times;
- parking = allocation, reserved/unreserved, pricing, visitor parking.

If no changes are found at all, return all 14 topics with empty field values and certainty "low".`;
exports.AMENDMENT_OPERATIONAL_GUARDRAILS_B_TAIL = `Section: Operational Guardrails (Part B — 14 topics: DELTA EXTRACTION)

Compare the amendment against the PREVIOUS VALUES below. For each topic:
- If the amendment MODIFIES the rule, fill that topic's synopsis/keyParameters/narrative with the NEW post-amendment statement and add a concise entry to the relevant field's amendments[] array describing the change (e.g. "Amendment 2: Restoration obligation waived").
- If the amendment is silent on a topic, return that topic with all field values as "" and certainty "low" (placeholder — the merger will keep the prior value).

Topic scope (these 14 only):
- hazardousMaterials = prohibited substances, disclosure, indemnity, pre-existing conditions;
- rulesAndRegulations = building rules, Landlord right to amend, enforcement;
- landlordsRightOfEntry = access purposes, advance notice, emergencies, showings;
- quietEnjoyment = quiet-enjoyment covenant, constructive eviction;
- assignmentAndSubletting = consent standard, permitted transfers, profit share, recapture;
- defaultAndRemedies = cure periods, acceleration, eviction, re-letting, mitigation, jury-trial waiver;
- landlordDefault = Landlord cure period, Tenant self-help, offset, damage caps;
- casualty = repair election, abatement, termination thresholds;
- condemnation = total vs partial taking, award allocation, termination rights;
- liabilityAndIndemnification = scope of mutual indemnities, gross-negligence carve-outs;
- liens = mechanics-lien prohibition, bonding, statutory waivers;
- notices = permitted delivery methods, notice addresses, effective dates;
- estoppel = response window, deemed approval, SNDA cooperation;
- subordination = subordination to existing/future mortgages, non-disturbance, attornment.

If no changes are found at all, return all 14 topics with empty field values and certainty "low".`;
exports.AMENDMENT_CAM_REVIEW_USER_TAIL = `Section: CAM Review (DELTA EXTRACTION)

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
function buildAmendmentUserContent(ocrPlainText, section, previousSectionJson) {
    const tail = exports.AMENDMENT_SECTION_USER_TAIL[section];
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
function buildAmendmentOperationalGuardrailsUserContent(ocrPlainText, batch, previousSectionJson) {
    const tail = batch === 'A'
        ? exports.AMENDMENT_OPERATIONAL_GUARDRAILS_A_TAIL
        : exports.AMENDMENT_OPERATIONAL_GUARDRAILS_B_TAIL;
    const keys = batch === 'A'
        ? [
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
        ]
        : [
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
        ];
    const filteredJson = {};
    if (previousSectionJson && typeof previousSectionJson === 'object') {
        const src = previousSectionJson;
        for (const key of keys) {
            if (key in src) {
                filteredJson[key] = src[key];
            }
        }
    }
    const previousJsonStr = JSON.stringify(filteredJson, null, 2);
    return `${ocrPlainText}

---

PREVIOUS VERSION VALUES (BATCH ${batch}):
\`\`\`json
${previousJsonStr}
\`\`\`

---

${tail}`;
}
function buildAmendmentCamReviewUserContent(ocrPlainText, previousCamJson) {
    const previousJsonStr = JSON.stringify(previousCamJson, null, 2);
    return `${ocrPlainText}

---

PREVIOUS VERSION VALUES:
\`\`\`json
${previousJsonStr}
\`\`\`

---

${exports.AMENDMENT_CAM_REVIEW_USER_TAIL}`;
}
//# sourceMappingURL=amendment-analysis-prompts.js.map