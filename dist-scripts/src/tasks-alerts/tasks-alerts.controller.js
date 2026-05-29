"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksAlertsController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../auth/guards/portfolio-access.guard");
const create_task_alert_dto_1 = require("./dto/create-task-alert.dto");
const patch_task_alert_dto_1 = require("./dto/patch-task-alert.dto");
const tasks_alerts_service_1 = require("./tasks-alerts.service");
let TasksAlertsController = class TasksAlertsController {
    constructor(tasksAlertsService) {
        this.tasksAlertsService = tasksAlertsService;
    }
    getGrouped(propertyId, portfolioId, leaseId) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        const lid = leaseId?.trim();
        return this.tasksAlertsService.findGrouped(pid, propertyId.trim(), lid || undefined);
    }
    create(propertyId, body) {
        return this.tasksAlertsService.create(propertyId.trim(), body);
    }
    patchItem(propertyId, itemId, body) {
        return this.tasksAlertsService.patchItem(propertyId.trim(), itemId.trim(), body);
    }
};
exports.TasksAlertsController = TasksAlertsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __param(2, (0, common_1.Query)('lease_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TasksAlertsController.prototype, "getGrouped", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_task_alert_dto_1.CreateTaskAlertDto]),
    __metadata("design:returntype", void 0)
], TasksAlertsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':itemId'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, patch_task_alert_dto_1.PatchTaskAlertDto]),
    __metadata("design:returntype", void 0)
], TasksAlertsController.prototype, "patchItem", null);
exports.TasksAlertsController = TasksAlertsController = __decorate([
    (0, common_1.Controller)('properties/:propertyId/tasks-alerts'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [tasks_alerts_service_1.TasksAlertsService])
], TasksAlertsController);
//# sourceMappingURL=tasks-alerts.controller.js.map