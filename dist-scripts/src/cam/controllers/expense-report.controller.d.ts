import { ExpenseReportService } from '../services/expense-report.service';
export declare class ExpenseReportController {
    private readonly svc;
    constructor(svc: ExpenseReportService);
    byCategory(portfolioId: string | undefined, propertyId: string | undefined, unitId: string | undefined, year: string | undefined, from: string | undefined, to: string | undefined): Promise<{
        total_invoiced: any;
        categories: any[];
        scope: {
            kind: string;
            unit_id: string;
            property_id?: undefined;
        } | {
            kind: string;
            property_id: string;
            unit_id?: undefined;
        };
        timeline: {
            calendar_year: number | null;
            from: Date | null;
            to: Date | null;
        };
    }>;
    drilldown(category: string, portfolioId: string | undefined, propertyId: string | undefined, unitId: string | undefined, year: string | undefined): Promise<(import("mongoose").FlattenMaps<import("../schemas/tenant-invoice.schema").TenantInvoiceDocumentModel> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
}
