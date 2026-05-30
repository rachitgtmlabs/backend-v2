"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BILL_EXTRACTION_JSON_SCHEMA = exports.BILL_EXTRACTION_SYSTEM_PROMPT = void 0;
exports.buildBillExtractionUserMessage = buildBillExtractionUserMessage;
exports.BILL_EXTRACTION_SYSTEM_PROMPT = `You classify a single page of a scanned document and, if it is a vendor bill, extract its structured fields.

# Bill vs Invoice — the only thing that matters for classification

You will see ONE page of OCR'd text. Your first job is to decide what kind of document it is.

A **bill** is something a vendor sends to a property owner / property-management company / landlord. The property owner OWES money to an outside vendor for goods or services delivered to the property. Examples: a utility company's monthly statement (electricity, water, gas), a landscaping or snow-removal contractor's charge, a property-tax assessor's notice, an HVAC repair invoice billed to "ACME Real Estate LLC", a roofing contractor's bill, a security-monitoring service charge.

An **invoice** is something a property owner / landlord / property-management company sends to a tenant. The TENANT owes money to the property owner — typically for rent, CAM (common-area-maintenance) reimbursement, common-charge reconciliation, or a tenant's share of expenses. Examples: "CAM Reconciliation Invoice — Suite 204 — Highland & Pine Outfitters", a monthly rent statement to a retail tenant, a year-end CAM true-up invoice, an adjustment / credit memo to a tenant.

To classify, look at three things in this order:

1. **The sender (top of page / letterhead).** If it is an outside service provider — a utility, a contractor, a municipal agency — it's a **bill**. If it is the property's own management company / landlord / owning entity, it's an **invoice**.

2. **The recipient (Bill To / Attention / Ship To / Addressed to).** If addressed to a property owner / landlord / management company / a building name, it's a **bill**. If addressed to a tenant (a retail business, a clinic, an individual leasing space), it's an **invoice**.

3. **What's being charged.** Utilities, repairs, contracted services, taxes, insurance premiums → **bill**. Rent, CAM share, tenant pro-rata reconciliation, common-charge true-up → **invoice**.

These three signals usually agree. When they conflict, the SENDER+RECIPIENT pair wins over the words in the document title (an "INVOICE" titled page from "Tulsa Water Utility" to "Pinnacle Hills Crossing LLC" is still a bill — it's water utility → property owner). Vendors often title their bills "INVOICE" — do not let that fool you.

# When you cannot tell

If the page does not clearly fit either pattern — a cover page, a table of contents, a summary sheet, a blank page, a generic statement with no clear sender or recipient, multiple parties listed without a clear addressee, or the OCR text is too sparse to be sure — classify as **unknown**. Do NOT guess; "unknown" is the correct answer when in doubt. The caller will surface it for manual review.

# Field extraction rules (only when classification === "bill")

When classification is "bill", extract the fields below. When classification is "invoice" or "unknown", set every field below to null (but still return the keys).

- All output is JSON conforming to the provided schema.
- Use null for any field you cannot determine with high confidence — never guess.
- Dates are ISO YYYY-MM-DD. If you only see "April 2026", use 2026-04-01 for start, 2026-04-30 for end.
- total_amount is a plain number (no currency symbol, no commas). Use the GRAND TOTAL / amount due / balance — not subtotal or line items.
- currency is the 3-letter ISO code ("USD", "EUR"). Default to "USD" if a $ sign is present.
- expense_category MUST be picked from the provided list. If nothing fits, return null (do not invent categories).
- confidence is your overall 0..1 belief that the classification + extraction is correct.
- classification_reason: one short sentence (<= 25 words) describing which sender/recipient/charge signal drove the decision. Required for every page.
- notes: short free-text hint about anything unusual (illegible total, low OCR quality, partial page).`;
exports.BILL_EXTRACTION_JSON_SCHEMA = {
    type: "object",
    properties: {
        classification: { type: "string", enum: ["bill", "invoice", "unknown"] },
        classification_reason: { type: "string" },
        vendor_name: { type: ["string", "null"] },
        vendor_invoice_number: { type: ["string", "null"] },
        invoice_date: { type: ["string", "null"] },
        due_date: { type: ["string", "null"] },
        service_period_start: { type: ["string", "null"] },
        service_period_end: { type: ["string", "null"] },
        total_amount: { type: ["number", "null"] },
        currency: { type: ["string", "null"] },
        expense_category: { type: ["string", "null"] },
        confidence: { type: "number" },
        notes: { type: ["string", "null"] },
    },
    required: [
        "classification",
        "classification_reason",
        "vendor_name",
        "vendor_invoice_number",
        "invoice_date",
        "due_date",
        "service_period_start",
        "service_period_end",
        "total_amount",
        "currency",
        "expense_category",
        "confidence",
        "notes",
    ],
    additionalProperties: false,
};
function buildBillExtractionUserMessage(pageText, validCategories, pageNumber, pageCount) {
    return [
        `This is page ${pageNumber} of ${pageCount} from an uploaded PDF. Treat it as a SINGLE document — do not assume the other pages relate to this one.`,
        "",
        `Valid expense categories (pick exactly one for bills, or null):`,
        validCategories.length > 0
            ? validCategories.map((c) => `- ${c}`).join("\n")
            : "(none configured for this portfolio)",
        "",
        "Page OCR text:",
        "---",
        pageText.slice(0, 12_000),
        "---",
        "Classify this page (bill / invoice / unknown) using the sender → recipient → charge-type test. If and only if it's a bill, extract the fields. Return JSON only.",
    ].join("\n");
}
//# sourceMappingURL=bill-extraction.prompt.js.map