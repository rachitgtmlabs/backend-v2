import { Model } from 'mongoose';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PropertyService } from '../property/property.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitDocumentModel } from './schemas/unit.schema';
export type UnitPayload = ReturnType<UnitService['toUnitPayload']>;
export declare class UnitService {
    private unitModel;
    private readonly portfolioService;
    private readonly propertyService;
    private readonly logger;
    constructor(unitModel: Model<UnitDocumentModel>, portfolioService: PortfolioService, propertyService: PropertyService);
    create(dto: CreateUnitDto): Promise<{
        unit: UnitPayload;
    }>;
    listByProperty(portfolioId: string, propertyId: string): Promise<{
        units: UnitPayload[];
    }>;
    getOne(portfolioId: string, unitId: string): Promise<{
        unit: UnitPayload;
    }>;
    update(unitId: string, dto: UpdateUnitDto): Promise<{
        unit: UnitPayload;
    }>;
    remove(portfolioId: string, unitId: string): Promise<void>;
    findMatch(portfolioId: string, propertyId: string, hint: string): Promise<{
        matched: boolean;
        unit: UnitPayload | null;
        candidates: Array<UnitPayload & {
            score: number;
        }>;
    }>;
    resolveSoleActiveUnit(portfolioId: string, propertyId: string): Promise<UnitDocumentModel | null>;
    findInPortfolioProperty(portfolioId: string, propertyId: string, unitId: string): Promise<UnitDocumentModel | null>;
    countsByPropertyIds(portfolioId: string, propertyIds: string[]): Promise<Map<string, {
        unit_count: number;
        active_count: number;
        default_unit_id: string | null;
    }>>;
    toUnitPayload(doc: UnitDocumentModel): {
        id: string;
        portfolio_id: string;
        property_id: string;
        unit_code: string;
        unit_name: string;
        unit_type: import("./schemas/unit.schema").UnitType | null;
        floor: string | null;
        building: string | null;
        premises: string | null;
        sqft_rentable: number | null;
        sqft_usable: number | null;
        parking_count: number | null;
        status: import("./schemas/unit.schema").UnitStatus;
        notes: string | null;
        is_default_migrated: boolean;
        audit: {
            created_at: string;
            updated_at: string;
        };
        links: {
            self: string;
        };
    };
    private ensurePortfolioPropertyPair;
    private findInPortfolioOrThrow;
}
