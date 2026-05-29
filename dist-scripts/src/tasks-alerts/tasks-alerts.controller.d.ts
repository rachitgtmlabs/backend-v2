import { CreateTaskAlertDto } from './dto/create-task-alert.dto';
import { PatchTaskAlertDto } from './dto/patch-task-alert.dto';
import { TasksAlertsService } from './tasks-alerts.service';
export declare class TasksAlertsController {
    private readonly tasksAlertsService;
    constructor(tasksAlertsService: TasksAlertsService);
    getGrouped(propertyId: string, portfolioId: string | undefined, leaseId: string | undefined): Promise<{
        alerts: import("./tasks-alerts.service").TaskAlertRowDto[];
        tasks: import("./tasks-alerts.service").TaskAlertRowDto[];
    }>;
    create(propertyId: string, body: CreateTaskAlertDto): Promise<{
        item: import("./tasks-alerts.service").TaskAlertRowDto;
    }>;
    patchItem(propertyId: string, itemId: string, body: PatchTaskAlertDto): Promise<{
        item: import("./tasks-alerts.service").TaskAlertRowDto;
    }>;
}
