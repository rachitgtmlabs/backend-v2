import { Model } from 'mongoose';
import { TenantInvoiceDocumentModel } from '../schemas/tenant-invoice.schema';
export declare class ExpenseReportService {
    private readonly model;
    constructor(model: Model<TenantInvoiceDocumentModel>);
    reportByCategory(args: {
        portfolio_id: string;
        property_id: string;
        unit_id?: string;
        calendar_year?: number;
        from?: Date;
        to?: Date;
    }): Promise<{
        total_invoiced: any;
        categories: any[];
        top_vendors: any[];
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
    drilldown(args: {
        portfolio_id: string;
        property_id: string;
        category: string;
        unit_id?: string;
        calendar_year?: number;
    }): Promise<(import("mongoose").FlattenMaps<TenantInvoiceDocumentModel> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
}
