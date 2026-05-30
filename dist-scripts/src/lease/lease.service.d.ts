import { Model } from 'mongoose';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PropertyService } from '../property/property.service';
import { TasksAlertsService } from '../tasks-alerts/tasks-alerts.service';
import { GcsThumbnailService } from '../property/gcs-thumbnail.service';
import { UnitService } from '../unit/unit.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { LeaseDocumentModel } from './schemas/lease.schema';
import { AmendmentDocumentModel } from './schemas/amendment.schema';
import { type FieldHistoryPayload } from './utils/field-history.util';
export declare class LeaseService {
    private leaseModel;
    private amendmentModel;
    private readonly portfolioService;
    private readonly propertyService;
    private readonly tasksAlertsService;
    private readonly gcsThumbnail;
    private readonly unitService;
    private readonly logger;
    constructor(leaseModel: Model<LeaseDocumentModel>, amendmentModel: Model<AmendmentDocumentModel>, portfolioService: PortfolioService, propertyService: PropertyService, tasksAlertsService: TasksAlertsService, gcsThumbnail: GcsThumbnailService, unitService: UnitService);
    create(dto: CreateLeaseDto, auth?: {
        userEmail?: string | null;
    }): Promise<{
        amendment: {
            id: string;
            lease_id: string;
            version: number;
            portfolio_id: string;
            property_id: string;
            unit_id: string | null;
            status: string;
            file_name: string;
            audit: {
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
                parent_lease: string;
            };
        };
    } | {
        lease: {
            id: string;
            portfolio_id: string;
            property_id: string | null;
            unit_id: string | null;
            status: string;
            file_name: string;
            amendment_version: number;
            audit: {
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
    }>;
    private resolveUnitIdForNewLease;
    private createAmendment;
    private createLease;
    getLatestForPortfolioProperty(portfolioId: string, propertyId: string): Promise<{
        lease: {
            id: string;
            portfolio_id: string;
            property_id: string | null;
            unit_id: string | null;
            status: string;
            file_name: string;
            gcs_document_path: string | null;
            lease_information: Record<string, unknown>;
            analysis: Record<string, unknown>;
            audit: {
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
        amendments: {
            id: string;
            version: number;
            file_name: string;
            gcs_document_path: string | null;
            drafted_amendments: import("./schemas/drafted-amendment.schema").DraftedAmendment[];
        }[];
        multi_unit: boolean;
    }>;
    getLatestForPortfolioUnit(portfolioId: string, unitId: string): Promise<{
        lease: {
            id: string;
            portfolio_id: string;
            property_id: string | null;
            unit_id: string | null;
            status: string;
            file_name: string;
            gcs_document_path: string | null;
            lease_information: Record<string, unknown>;
            analysis: Record<string, unknown>;
            audit: {
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
        amendments: {
            id: string;
            version: number;
            file_name: string;
            gcs_document_path: string | null;
            drafted_amendments: import("./schemas/drafted-amendment.schema").DraftedAmendment[];
        }[];
    }>;
    listDocumentsForPortfolioProperty(portfolioId: string, propertyId: string): Promise<{
        active: {
            id: string;
            kind: "lease" | "amendment";
            file_name: string;
            status: string;
            updated_at: string;
        }[];
        draft: {
            id: string;
            kind: "lease" | "amendment";
            file_name: string;
            status: string;
            updated_at: string;
        }[];
    }>;
    listDocumentsForPortfolioUnit(portfolioId: string, unitId: string): Promise<{
        active: {
            id: string;
            kind: "lease" | "amendment";
            file_name: string;
            status: string;
            updated_at: string;
        }[];
        draft: {
            id: string;
            kind: "lease" | "amendment";
            file_name: string;
            status: string;
            updated_at: string;
        }[];
    }>;
    getEffectiveState(leaseId: string): Promise<{
        leaseId: string;
        currentVersion: number;
        effectiveLeaseInfo: Record<string, unknown>;
        effectiveAnalysis: Record<string, unknown>;
        lease: {
            id: string;
            portfolio_id: string;
            property_id: string | null;
            unit_id: string | null;
            status: string;
            file_name: string;
            gcs_document_path: string | null;
            amendment_version: number;
            created_at: string;
            updated_at: string;
        };
        amendments: {
            version: number;
            amendmentId: string;
            file_name: string;
            status: string;
            gcs_document_path: string | null;
            changedSections: string[];
            updated_at: string;
        }[];
    }>;
    getEffectiveStateByUnit(portfolioId: string, unitId: string): Promise<{
        leaseId: string;
        currentVersion: number;
        effectiveLeaseInfo: Record<string, unknown>;
        effectiveAnalysis: Record<string, unknown>;
        lease: {
            id: string;
            portfolio_id: string;
            property_id: string | null;
            unit_id: string | null;
            status: string;
            file_name: string;
            gcs_document_path: string | null;
            amendment_version: number;
            created_at: string;
            updated_at: string;
        };
        amendments: {
            version: number;
            amendmentId: string;
            file_name: string;
            status: string;
            gcs_document_path: string | null;
            changedSections: string[];
            updated_at: string;
        }[];
    }>;
    getEffectiveStateByProperty(portfolioId: string, propertyId: string): Promise<{
        leaseId: string;
        currentVersion: number;
        effectiveLeaseInfo: Record<string, unknown>;
        effectiveAnalysis: Record<string, unknown>;
        lease: {
            id: string;
            portfolio_id: string;
            property_id: string | null;
            unit_id: string | null;
            status: string;
            file_name: string;
            gcs_document_path: string | null;
            amendment_version: number;
            created_at: string;
            updated_at: string;
        };
        amendments: {
            version: number;
            amendmentId: string;
            file_name: string;
            status: string;
            gcs_document_path: string | null;
            changedSections: string[];
            updated_at: string;
        }[];
    }>;
    getAmendment(amendmentId: string): Promise<{
        amendment: {
            id: string;
            lease_id: string;
            version: number;
            portfolio_id: string;
            property_id: string;
            status: string;
            file_name: string;
            lease_information: Record<string, unknown>;
            analysis: Record<string, unknown>;
            audit: {
                created_at: string;
                updated_at: string;
            };
        };
    }>;
    downloadDocument(objectPath: string): Promise<{
        buffer: Buffer;
        contentType: string;
    }>;
    getFieldHistory(leaseId: string): Promise<FieldHistoryPayload>;
    listAmendments(leaseId: string): Promise<{
        lease_id: string;
        amendments: {
            id: string;
            version: number;
            status: string;
            file_name: string;
            changedSections: string[];
            audit: {
                created_at: string;
                updated_at: string;
            };
        }[];
    }>;
}
