import { Model } from 'mongoose';
import { AmendmentDocumentModel } from '../lease/schemas/amendment.schema';
import { LeaseDocumentModel } from '../lease/schemas/lease.schema';
import { PropertyDocumentModel } from '../property/schemas/property.schema';
import { PropertyAlertDocumentModel } from '../tasks-alerts/schemas/property-alert.schema';
import { TaskAlertDocumentModel } from '../tasks-alerts/schemas/task-alert.schema';
import { UnitDocumentModel } from '../unit/schemas/unit.schema';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { PortfolioDocumentModel } from './schemas/portfolio.schema';
export declare class PortfolioService {
    private portfolioModel;
    private propertyModel;
    private leaseModel;
    private amendmentModel;
    private taskAlertModel;
    private propertyAlertModel;
    private unitModel;
    constructor(portfolioModel: Model<PortfolioDocumentModel>, propertyModel: Model<PropertyDocumentModel>, leaseModel: Model<LeaseDocumentModel>, amendmentModel: Model<AmendmentDocumentModel>, taskAlertModel: Model<TaskAlertDocumentModel>, propertyAlertModel: Model<PropertyAlertDocumentModel>, unitModel: Model<UnitDocumentModel>);
    create(dto: CreatePortfolioDto, userId: string | undefined, orgId: string | undefined): Promise<{
        portfolio: {
            id: string;
            name: string;
            description: string;
            classification: import("./schemas/portfolio.schema").Classification;
            locale: import("./schemas/portfolio.schema").Locale;
            stakeholders: import("./schemas/portfolio.schema").Stakeholder[];
            document_requirements: {
                id: string;
                document_type: string;
                requirement_level: string;
            }[];
            tags: string[];
            attributes: import("./schemas/portfolio.schema").Attributes;
            status: string;
            property_count: number;
            audit: {
                created_by: string;
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
    }>;
    findAll(orgId?: string): Promise<{
        portfolios: {
            alert_status: "critical" | "high" | "ok";
            id: string;
            name: string;
            description: string;
            classification: import("./schemas/portfolio.schema").Classification;
            locale: import("./schemas/portfolio.schema").Locale;
            stakeholders: import("./schemas/portfolio.schema").Stakeholder[];
            document_requirements: {
                id: string;
                document_type: string;
                requirement_level: string;
            }[];
            tags: string[];
            attributes: import("./schemas/portfolio.schema").Attributes;
            status: string;
            property_count: number;
            audit: {
                created_by: string;
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        }[];
    }>;
    private computeAlertStatusByPortfolioIds;
    private countPropertiesByPortfolioIds;
    existsByPortfolioId(portfolioId: string): Promise<boolean>;
    canUserAccess(portfolioIdRaw: string, orgId?: string): Promise<boolean>;
    findOne(portfolioIdRaw: string, orgId?: string): Promise<{
        portfolio: {
            id: string;
            name: string;
            description: string;
            classification: import("./schemas/portfolio.schema").Classification;
            locale: import("./schemas/portfolio.schema").Locale;
            stakeholders: import("./schemas/portfolio.schema").Stakeholder[];
            document_requirements: {
                id: string;
                document_type: string;
                requirement_level: string;
            }[];
            tags: string[];
            attributes: import("./schemas/portfolio.schema").Attributes;
            status: string;
            property_count: number;
            audit: {
                created_by: string;
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
    }>;
    update(portfolioIdRaw: string, dto: CreatePortfolioDto, orgId?: string): Promise<{
        portfolio: {
            id: string;
            name: string;
            description: string;
            classification: import("./schemas/portfolio.schema").Classification;
            locale: import("./schemas/portfolio.schema").Locale;
            stakeholders: import("./schemas/portfolio.schema").Stakeholder[];
            document_requirements: {
                id: string;
                document_type: string;
                requirement_level: string;
            }[];
            tags: string[];
            attributes: import("./schemas/portfolio.schema").Attributes;
            status: string;
            property_count: number;
            audit: {
                created_by: string;
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
    }>;
    getDeletionImpact(portfolioIdRaw: string, orgId?: string): Promise<{
        leases: {
            id: string;
            file_name: string;
            property_id: string | null;
            status: string;
        }[];
        amendments: {
            id: string;
            lease_id: string;
            version: number;
            file_name: string;
            property_id: string;
            status: string;
        }[];
    }>;
    remove(portfolioIdRaw: string, orgId?: string): Promise<void>;
    private toResponse;
}
