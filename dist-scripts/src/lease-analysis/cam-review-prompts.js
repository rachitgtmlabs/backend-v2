"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAM_REVIEW_USER_TAIL = void 0;
exports.CAM_REVIEW_USER_TAIL = `You are reviewing ONLY common area maintenance (CAM), operating expenses, additional rent, pass-throughs, expense stops, caps/admin fees, reconciliation, and related audit / inspection rights in this lease text.

Extract a JSON object with exactly these top-level keys (use [] or {} when nothing applies):

1) ambiguities — unclear, vague, or inconsistently worded CAM-related clauses. Each item: description (what is unclear), location (section number, exhibit, or "p.X" if inferable from [PAGE n] markers), potentialIssue, recommendedAction.

2) conflicts — provisions that contradict each other on CAM/expenses. Each item: description, conflictingProvisions (array of short quotes or paraphrases), potentialResolution.

3) missingProvisions — expected CAM protections or definitions often absent in weaker drafts. Each item: provisionType (e.g. "CAM cap", "admin fee definition", "exclusions from CAM", "reconciliation timing"), significance (Low|Medium|High), tenantRisk.

4) tenantConcerns — items a tenant counsel would flag. Each item: concernType (short label), description, riskLevel (Low|Medium|High|Critical).

5) camRules — every distinct CAM clause, rule, or provision found in the lease, each as a structured item. Assign sequential ruleIds (R-1, R-2, …). Each item: ruleId, pageNumber (primary page), ruleText (verbatim or close paraphrase of the clause), ruleCategory (one of: proportionateShare | camExpenseCategories | exclusions | paymentTerms | capsLimitations | reconciliationProcedures | baseYearProvisions | grossUpProvisions | administrativeFees | auditRights | noticeRequirements | controllableVsNonControllable | definitions | calculationMethods), confidenceScore (0.0–1.0 based on how clearly the clause states the rule), sourcePages (array of page numbers where evidence was found).

6) flagsAndObservations — high-level one-line string notes organized by type (different from the detailed arrays above). Each sub-key is an array of strings: ambiguities (brief notes on unclear language), conflicts (brief notes on contradictions), missingProvisions (brief notes on gaps), tenantConcerns (brief notes on tenant exposure). Use [] when none.

7) summary — aggregate analysis. Fields: totalRulesExtracted (count of camRules), rulesByCategory (object with counts per category — set to 0 for absent categories; all 14 keys required: proportionateShare, camExpenseCategories, exclusions, paymentTerms, capsLimitations, reconciliationProcedures, baseYearProvisions, grossUpProvisions, administrativeFees, auditRights, noticeRequirements, controllableVsNonControllable, definitions, calculationMethods), overallTenantRiskAssessment (Low|Medium|High|Critical based on the aggregate risk to the tenant), keyTenantProtections (array of strings — brief description of clauses that protect the tenant), keyTenantExposures (array of strings — brief description of clauses that expose the tenant to financial or legal risk).

Be conservative: if the text is silent on CAM, return mostly missingProvisions and few or empty other arrays. Output valid JSON only.`;
//# sourceMappingURL=cam-review-prompts.js.map