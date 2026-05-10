/** User tail after OCR + --- delimiter; root JSON schema is enforced by Groq. */
export const CAM_REVIEW_USER_TAIL = `You are reviewing ONLY common area maintenance (CAM), operating expenses, additional rent, pass-throughs, expense stops, caps/admin fees, reconciliation, and related audit / inspection rights in this lease text.

Extract a JSON object with exactly these top-level arrays (use [] when nothing applies):

1) ambiguities — unclear, vague, or inconsistently worded CAM-related clauses. Each item: description (what is unclear), location (section number, exhibit, or "p.X" if inferable from [PAGE n] markers), potentialIssue, recommendedAction.

2) conflicts — provisions that contradict each other on CAM/expenses. Each item: description, conflictingProvisions (array of short quotes or paraphrases), potentialResolution.

3) missingProvisions — expected CAM protections or definitions often absent in weaker drafts. Each item: provisionType (e.g. "CAM cap", "admin fee definition", "exclusions from CAM", "reconciliation timing"), significance (Low|Medium|High), tenantRisk.

4) tenantConcerns — items a tenant counsel would flag. Each item: concernType (short label), description, riskLevel (Low|Medium|High|Critical).

Be conservative: if the text is silent on CAM, return mostly missingProvisions and few or empty other arrays. Output valid JSON only.`;
