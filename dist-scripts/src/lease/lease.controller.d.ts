import { StreamableFile } from '@nestjs/common';
import { Request, Response } from 'express';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { LeaseService } from './lease.service';
export declare class LeaseController {
    private readonly leaseService;
    constructor(leaseService: LeaseService);
    getLatestForProperty(propertyId: string, portfolioId: string | undefined, res: Response): Promise<{
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
    getLatestForUnit(unitId: string, portfolioId: string | undefined): Promise<{
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
    getDocument(objectPath: string | undefined, res: Response): Promise<StreamableFile>;
    listDocumentsForProperty(propertyId: string, portfolioId: string | undefined, res: Response): Promise<{
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
    listDocumentsForUnit(unitId: string, portfolioId: string | undefined): Promise<{
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
    getEffectiveStateByProperty(propertyId: string, portfolioId: string | undefined, res: Response): Promise<{
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
    getEffectiveStateByUnit(unitId: string, portfolioId: string | undefined): Promise<{
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
    getFieldHistory(leaseId: string): Promise<import("./utils/field-history.util").FieldHistoryPayload>;
    create(body: CreateLeaseDto, req: Request): Promise<{
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
}
export declare class AmendmentController {
    private readonly leaseService;
    constructor(leaseService: LeaseService);
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
}
