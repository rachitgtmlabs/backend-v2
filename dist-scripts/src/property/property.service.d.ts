import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { AmendmentDocumentModel } from '../lease/schemas/amendment.schema';
import { LeaseDocumentModel } from '../lease/schemas/lease.schema';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PropertyAlertDocumentModel } from '../tasks-alerts/schemas/property-alert.schema';
import { TaskAlertDocumentModel } from '../tasks-alerts/schemas/task-alert.schema';
import { UnitDocumentModel } from '../unit/schemas/unit.schema';
import { CreatePropertyFormDto } from './dto/create-property-form.dto';
import { GcsThumbnailService } from './gcs-thumbnail.service';
import { PropertyDocumentModel } from './schemas/property.schema';
export declare class PropertyService {
    private propertyModel;
    private leaseModel;
    private amendmentModel;
    private taskAlertModel;
    private propertyAlertModel;
    private unitModel;
    private readonly portfolioService;
    private readonly gcsThumbnail;
    private readonly config;
    private readonly logger;
    constructor(propertyModel: Model<PropertyDocumentModel>, leaseModel: Model<LeaseDocumentModel>, amendmentModel: Model<AmendmentDocumentModel>, taskAlertModel: Model<TaskAlertDocumentModel>, propertyAlertModel: Model<PropertyAlertDocumentModel>, unitModel: Model<UnitDocumentModel>, portfolioService: PortfolioService, gcsThumbnail: GcsThumbnailService, config: ConfigService);
    create(dto: CreatePropertyFormDto, file?: Express.Multer.File): Promise<{
        property: {
            id: string;
            portfolio_id: string;
            property_name: string;
            address: string;
            property_type: string;
            thumbnail_url: string | null;
            unit_count: number | undefined;
            occupied_count: number | undefined;
            default_unit_id: string | null;
            audit: {
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
    }>;
    listByPortfolioId(portfolioId: string): Promise<{
        properties: {
            id: string;
            portfolio_id: string;
            property_name: string;
            address: string;
            property_type: string;
            thumbnail_url: string | null;
            unit_count: number | undefined;
            occupied_count: number | undefined;
            default_unit_id: string | null;
            audit: {
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        }[];
    }>;
    private aggregateUnitStats;
    getDeletionImpact(portfolioIdRaw: string, propertyIdRaw: string): Promise<{
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
    remove(portfolioIdRaw: string, propertyIdRaw: string): Promise<void>;
    belongsToPortfolio(propertyId: string, portfolioId: string): Promise<boolean>;
    private defaultPropertyThumbnailUrl;
    private buildAssetProxyUrl;
    private toResponse;
    private toPropertyPayload;
}
