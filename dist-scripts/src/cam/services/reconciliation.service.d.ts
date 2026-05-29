import { Model } from 'mongoose';
import { LeaseDocumentModel } from '../../lease/schemas/lease.schema';
import { UnitDocumentModel } from '../../unit/schemas/unit.schema';
import { type ReconDiff } from '../engine';
import { BillDocumentModel } from '../schemas/bill.schema';
import { ReconciliationRun, ReconciliationRunDocumentModel, ReconciliationRunMode } from '../schemas/reconciliation-run.schema';
import { TenantInvoiceDocumentModel } from '../schemas/tenant-invoice.schema';
export declare class ReconciliationService {
    private readonly billModel;
    private readonly unitModel;
    private readonly invoiceModel;
    private readonly runModel;
    private readonly leaseModel;
    private readonly logger;
    constructor(billModel: Model<BillDocumentModel>, unitModel: Model<UnitDocumentModel>, invoiceModel: Model<TenantInvoiceDocumentModel>, runModel: Model<ReconciliationRunDocumentModel>, leaseModel: Model<LeaseDocumentModel>);
    run(args: {
        portfolio_id: string;
        property_id: string;
        calendar_year: number;
        unit_id?: string;
        apply?: boolean;
        apply_reason?: string;
        actor?: string;
    }): Promise<{
        run: import("mongoose").Document<unknown, {}, ReconciliationRun, {}, {}> & ReconciliationRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            createdAt: Date;
            updatedAt: Date;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        diff: ReconDiff;
        adjustment_invoice_ids: string[];
    }>;
    listRuns(filter: {
        portfolio_id: string;
        property_id?: string;
        calendar_year?: number;
        mode?: ReconciliationRunMode;
        limit?: number;
    }): Promise<(import("mongoose").FlattenMaps<ReconciliationRunDocumentModel> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    getRun(portfolioId: string, runId: string): Promise<import("mongoose").FlattenMaps<ReconciliationRunDocumentModel> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    private resolveTenantNamesForUnits;
}
