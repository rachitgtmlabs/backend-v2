export type PageClassification = 'bill' | 'invoice' | 'unknown';
export interface BillExtractionResult {
    classification: PageClassification;
    classification_reason: string;
    vendor_name: string | null;
    vendor_invoice_number: string | null;
    invoice_date: string | null;
    due_date: string | null;
    service_period_start: string | null;
    service_period_end: string | null;
    total_amount: number | null;
    currency: string | null;
    expense_category: string | null;
    confidence: number;
    notes: string | null;
}
export declare const BILL_EXTRACTION_SYSTEM_PROMPT = "You classify a single page of a scanned document and, if it is a vendor bill, extract its structured fields.\n\n# Bill vs Invoice \u2014 the only thing that matters for classification\n\nYou will see ONE page of OCR'd text. Your first job is to decide what kind of document it is.\n\nA **bill** is something a vendor sends to a property owner / property-management company / landlord. The property owner OWES money to an outside vendor for goods or services delivered to the property. Examples: a utility company's monthly statement (electricity, water, gas), a landscaping or snow-removal contractor's charge, a property-tax assessor's notice, an HVAC repair invoice billed to \"ACME Real Estate LLC\", a roofing contractor's bill, a security-monitoring service charge.\n\nAn **invoice** is something a property owner / landlord / property-management company sends to a tenant. The TENANT owes money to the property owner \u2014 typically for rent, CAM (common-area-maintenance) reimbursement, common-charge reconciliation, or a tenant's share of expenses. Examples: \"CAM Reconciliation Invoice \u2014 Suite 204 \u2014 Highland & Pine Outfitters\", a monthly rent statement to a retail tenant, a year-end CAM true-up invoice, an adjustment / credit memo to a tenant.\n\nTo classify, look at three things in this order:\n\n1. **The sender (top of page / letterhead).** If it is an outside service provider \u2014 a utility, a contractor, a municipal agency \u2014 it's a **bill**. If it is the property's own management company / landlord / owning entity, it's an **invoice**.\n\n2. **The recipient (Bill To / Attention / Ship To / Addressed to).** If addressed to a property owner / landlord / management company / a building name, it's a **bill**. If addressed to a tenant (a retail business, a clinic, an individual leasing space), it's an **invoice**.\n\n3. **What's being charged.** Utilities, repairs, contracted services, taxes, insurance premiums \u2192 **bill**. Rent, CAM share, tenant pro-rata reconciliation, common-charge true-up \u2192 **invoice**.\n\nThese three signals usually agree. When they conflict, the SENDER+RECIPIENT pair wins over the words in the document title (an \"INVOICE\" titled page from \"Tulsa Water Utility\" to \"Pinnacle Hills Crossing LLC\" is still a bill \u2014 it's water utility \u2192 property owner). Vendors often title their bills \"INVOICE\" \u2014 do not let that fool you.\n\n# When you cannot tell\n\nIf the page does not clearly fit either pattern \u2014 a cover page, a table of contents, a summary sheet, a blank page, a generic statement with no clear sender or recipient, multiple parties listed without a clear addressee, or the OCR text is too sparse to be sure \u2014 classify as **unknown**. Do NOT guess; \"unknown\" is the correct answer when in doubt. The caller will surface it for manual review.\n\n# Field extraction rules (only when classification === \"bill\")\n\nWhen classification is \"bill\", extract the fields below. When classification is \"invoice\" or \"unknown\", set every field below to null (but still return the keys).\n\n- All output is JSON conforming to the provided schema.\n- Use null for any field you cannot determine with high confidence \u2014 never guess.\n- Dates are ISO YYYY-MM-DD. If you only see \"April 2026\", use 2026-04-01 for start, 2026-04-30 for end.\n- total_amount is a plain number (no currency symbol, no commas). Use the GRAND TOTAL / amount due / balance \u2014 not subtotal or line items.\n- currency is the 3-letter ISO code (\"USD\", \"EUR\"). Default to \"USD\" if a $ sign is present.\n- expense_category MUST be picked from the provided list. If nothing fits, return null (do not invent categories).\n- confidence is your overall 0..1 belief that the classification + extraction is correct.\n- classification_reason: one short sentence (<= 25 words) describing which sender/recipient/charge signal drove the decision. Required for every page.\n- notes: short free-text hint about anything unusual (illegible total, low OCR quality, partial page).";
export declare const BILL_EXTRACTION_JSON_SCHEMA: {
    readonly type: "object";
    readonly properties: {
        readonly classification: {
            readonly type: "string";
            readonly enum: readonly ["bill", "invoice", "unknown"];
        };
        readonly classification_reason: {
            readonly type: "string";
        };
        readonly vendor_name: {
            readonly type: readonly ["string", "null"];
        };
        readonly vendor_invoice_number: {
            readonly type: readonly ["string", "null"];
        };
        readonly invoice_date: {
            readonly type: readonly ["string", "null"];
        };
        readonly due_date: {
            readonly type: readonly ["string", "null"];
        };
        readonly service_period_start: {
            readonly type: readonly ["string", "null"];
        };
        readonly service_period_end: {
            readonly type: readonly ["string", "null"];
        };
        readonly total_amount: {
            readonly type: readonly ["number", "null"];
        };
        readonly currency: {
            readonly type: readonly ["string", "null"];
        };
        readonly expense_category: {
            readonly type: readonly ["string", "null"];
        };
        readonly confidence: {
            readonly type: "number";
        };
        readonly notes: {
            readonly type: readonly ["string", "null"];
        };
    };
    readonly required: readonly ["classification", "classification_reason", "vendor_name", "vendor_invoice_number", "invoice_date", "due_date", "service_period_start", "service_period_end", "total_amount", "currency", "expense_category", "confidence", "notes"];
    readonly additionalProperties: false;
};
export declare function buildBillExtractionUserMessage(pageText: string, validCategories: readonly string[], pageNumber: number, pageCount: number): string;
