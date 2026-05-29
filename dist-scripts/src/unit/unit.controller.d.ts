import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitService } from './unit.service';
export declare class UnitController {
    private readonly unitService;
    constructor(unitService: UnitService);
    list(portfolioId: string | undefined, propertyId: string | undefined): Promise<{
        units: import("./unit.service").UnitWithLeaseSummaryPayload[];
    }>;
    match(portfolioId: string | undefined, propertyId: string | undefined, hint: string | undefined): Promise<{
        matched: boolean;
        unit: import("./unit.service").UnitPayload | null;
        candidates: Array<import("./unit.service").UnitPayload & {
            score: number;
        }>;
    }>;
    getOne(unitId: string, portfolioId: string | undefined): Promise<{
        unit: import("./unit.service").UnitPayload;
    }>;
    create(body: CreateUnitDto): Promise<{
        unit: import("./unit.service").UnitPayload;
    }>;
    update(unitId: string, body: UpdateUnitDto): Promise<{
        unit: import("./unit.service").UnitPayload;
    }>;
    remove(unitId: string, portfolioId: string | undefined): Promise<void>;
}
