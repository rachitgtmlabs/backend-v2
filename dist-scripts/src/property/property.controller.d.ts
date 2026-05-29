import type { Response } from 'express';
import { CreatePropertyFormDto } from './dto/create-property-form.dto';
import { GcsThumbnailService } from './gcs-thumbnail.service';
import { PropertyService } from './property.service';
export declare class PropertyController {
    private readonly propertyService;
    private readonly gcsThumbnail;
    constructor(propertyService: PropertyService, gcsThumbnail: GcsThumbnailService);
    listByPortfolio(portfolioId: string | undefined): Promise<{
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
    getAsset(objectPath: string, res: Response): Promise<void>;
    deletionImpact(propertyId: string, portfolioId: string | undefined): Promise<{
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
    remove(propertyId: string, portfolioId: string | undefined): Promise<void>;
    create(body: CreatePropertyFormDto, thumbnail: Express.Multer.File | undefined): Promise<{
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
}
