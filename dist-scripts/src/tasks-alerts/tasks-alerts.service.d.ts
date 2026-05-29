import { Model } from 'mongoose';
import { LeaseDocumentModel } from '../lease/schemas/lease.schema';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PropertyService } from '../property/property.service';
import { CreateTaskAlertDto } from './dto/create-task-alert.dto';
import { PatchTaskAlertDto } from './dto/patch-task-alert.dto';
import { PropertyAlertDocumentModel } from './schemas/property-alert.schema';
import { TaskAlertDocumentModel, TaskAlertSeverity } from './schemas/task-alert.schema';
export type TaskAlertRowDto = {
    id: string;
    title: string;
    severity: TaskAlertSeverity;
    details?: string;
    sortOrder?: number;
    is_resolved: boolean;
    alert_type?: string;
    due_timeline?: string;
    suggested_action?: string;
};
export declare class TasksAlertsService {
    private readonly propertyAlertModel;
    private readonly taskAlertModel;
    private readonly leaseModel;
    private readonly portfolioService;
    private readonly propertyService;
    constructor(propertyAlertModel: Model<PropertyAlertDocumentModel>, taskAlertModel: Model<TaskAlertDocumentModel>, leaseModel: Model<LeaseDocumentModel>, portfolioService: PortfolioService, propertyService: PropertyService);
    private assertPortfolioAndProperty;
    private resolveLeaseId;
    private mapToRowDto;
    private sortAlertRows;
    private sortTaskRows;
    findGrouped(portfolioId: string, propertyId: string, leaseId: string | undefined): Promise<{
        alerts: TaskAlertRowDto[];
        tasks: TaskAlertRowDto[];
    }>;
    create(propertyIdFromRoute: string, dto: CreateTaskAlertDto): Promise<{
        item: TaskAlertRowDto;
    }>;
    patchItem(propertyIdFromRoute: string, itemId: string, dto: PatchTaskAlertDto): Promise<{
        item: TaskAlertRowDto;
    }>;
    seedForNewLease(portfolioId: string, propertyId: string, leaseId: string, unitId?: string | null): Promise<void>;
}
