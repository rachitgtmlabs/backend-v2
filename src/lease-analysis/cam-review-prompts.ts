/** User tail after OCR + --- delimiter; root JSON schema is enforced by Groq. */
export const CAM_REVIEW_USER_TAIL = `You are reviewing ONLY common area maintenance (CAM), operating expenses, additional rent, pass-throughs, expense stops, caps/admin fees, reconciliation, and related audit / inspection rights in this lease text.

Extract a JSON object with exactly these top-level keys (use [] or {} when nothing applies):

1) ambiguities — unclear, vague, or inconsistently worded CAM-related clauses. Each item: description (what is unclear), location (section number, exhibit, or "p.X" if inferable from [PAGE n] markers), potentialIssue, recommendedAction.

2) conflicts — provisions that contradict each other on CAM/expenses. Each item: description, conflictingProvisions (array of short quotes or paraphrases), potentialResolution.

3) missingProvisions — expected CAM protections or definitions often absent in weaker drafts. Each item: provisionType (e.g. "CAM cap", "admin fee definition", "exclusions from CAM", "reconciliation timing"), significance (Low|Medium|High), tenantRisk.

4) tenantConcerns — items a tenant counsel would flag. Each item: concernType (short label), description, riskLevel (Low|Medium|High|Critical).

5) camRules — every distinct CAM clause, rule, or provision found in the lease, each as a structured item. Assign sequential ruleIds (R-1, R-2, …). Each item: ruleId, pageNumber (primary page), ruleText (verbatim or close paraphrase of the clause), ruleCategory (one of: proportionateShare | camExpenseCategories | exclusions | paymentTerms | capsLimitations | reconciliationProcedures | baseYearProvisions | grossUpProvisions | administrativeFees | auditRights | noticeRequirements | controllableVsNonControllable | definitions | calculationMethods), confidenceScore (0.0–1.0 based on how clearly the clause states the rule), sourcePages (array of page numbers where evidence was found).

6) flagsAndObservations — high-level one-line string notes organized by type (different from the detailed arrays above). Each sub-key is an array of strings: ambiguities (brief notes on unclear language), conflicts (brief notes on contradictions), missingProvisions (brief notes on gaps), tenantConcerns (brief notes on tenant exposure). Use [] when none.

7) summary — aggregate analysis. Fields: totalRulesExtracted (count of camRules), rulesByCategory (object with counts per category — set to 0 for absent categories; all 14 keys required: proportionateShare, camExpenseCategories, exclusions, paymentTerms, capsLimitations, reconciliationProcedures, baseYearProvisions, grossUpProvisions, administrativeFees, auditRights, noticeRequirements, controllableVsNonControllable, definitions, calculationMethods), overallTenantRiskAssessment (Low|Medium|High|Critical based on the aggregate risk to the tenant), keyTenantProtections (array of strings — brief description of clauses that protect the tenant), keyTenantExposures (array of strings — brief description of clauses that expose the tenant to financial or legal risk).

8) suggestedAllocation — a best-effort structured CAM allocation for THIS tenant, used to pre-fill a per-unit billing form. Pull the numbers directly from the lease where stated; do NOT invent values. Fields:
   - available (boolean): true only if the lease states at least the tenant's proportionate share OR a base/expense-stop amount; false otherwise.
   - share_pct (number 0.0–1.0 or null): the tenant's proportionate share of CAM as a DECIMAL (e.g. 17.5% → 0.175). null if not stated.
   - base_amount (number or null): the base year amount / expense stop / ceiling absorbed by the tenant in dollars. 0 means full pass-through. null if not stated.
   - base_year (integer or null): the base year the stop/ceiling is measured against, if any.
   - admin_fee_pct (number 0.0–1.0 or null): administrative/management fee surcharge as a DECIMAL. null if none stated.
   - exclusions (array of strings): expense categories explicitly excluded from CAM pass-through (e.g. "Capital Improvements", "Property Taxes"). [] if none.
   - rule_name (string): a short human label for the governing clause, e.g. "Section 5.3 — CAM Recovery". "" if none.
   - rule_ids (array of strings): the lease section/exhibit citations the values came from (e.g. ["§5.3", "Exhibit C"]). [] if none.
   - confidence (number 0.0–1.0): how confident you are these values are correct and complete.
   - sourcePages (array of integers): page numbers (from [PAGE n] markers) the values were read from.
   - notes (string): one or two sentences on caveats (e.g. "Share % stated as a range; used midpoint"). "" if none.

Be conservative: if the text is silent on CAM, return mostly missingProvisions and few or empty other arrays, and set suggestedAllocation.available=false with null numeric fields. Output valid JSON only.`;
