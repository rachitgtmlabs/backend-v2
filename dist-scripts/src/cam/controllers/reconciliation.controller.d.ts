import { ReconcileYearDto } from '../dto/reconcile.dto';
import { ReconciliationRunMode } from '../schemas/reconciliation-run.schema';
import { ReconciliationService } from '../services/reconciliation.service';
export declare class ReconciliationController {
    private readonly svc;
    constructor(svc: ReconciliationService);
    run(dto: ReconcileYearDto): Promise<{
        run: import("mongoose").Document<unknown, {}, import("../schemas/reconciliation-run.schema").ReconciliationRun, {}, {}> & import("../schemas/reconciliation-run.schema").ReconciliationRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            createdAt: Date;
            updatedAt: Date;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        diff: import("../engine").ReconDiff;
        adjustment_invoice_ids: string[];
    }>;
    list(portfolioId: string | undefined, propertyId: string | undefined, year: string | undefined, mode: ReconciliationRunMode | undefined, limit: string | undefined): Promise<(import("mongoose").FlattenMaps<import("../schemas/reconciliation-run.schema").ReconciliationRunDocumentModel> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    getOne(runId: string, portfolioId: string | undefined): Promise<import("mongoose").FlattenMaps<import("../schemas/reconciliation-run.schema").ReconciliationRunDocumentModel> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
