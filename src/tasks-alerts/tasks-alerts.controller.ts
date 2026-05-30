import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PortfolioAccessGuard } from '../auth/guards/portfolio-access.guard';
import { CreateTaskAlertDto } from './dto/create-task-alert.dto';
import { PatchTaskAlertDto } from './dto/patch-task-alert.dto';
import { TasksAlertsService } from './tasks-alerts.service';

@Controller('properties/:propertyId/tasks-alerts')
@UseGuards(PortfolioAccessGuard)
export class TasksAlertsController {
  constructor(private readonly tasksAlertsService: TasksAlertsService) {}

  /**
   * GET /v1/properties/:propertyId/tasks-alerts?portfolio_id=…&lease_id=…
   *
   * `portfolio_id` is required. If `lease_id` is omitted, rows are scoped to the
   * latest saved main lease for this property (same ordering as
   * GET /v1/leases/by-property/:propertyId/latest).
   */
  @Get()
  getGrouped(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('lease_id') leaseId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException('Query parameter portfolio_id is required');
    }
    const lid = leaseId?.trim();
    return this.tasksAlertsService.findGrouped(
      pid,
      propertyId.trim(),
      lid || undefined,
    );
  }

  /**
   * POST /v1/properties/:propertyId/tasks-alerts
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('propertyId') propertyId: string,
    @Body() body: CreateTaskAlertDto,
  ) {
    return this.tasksAlertsService.create(propertyId.trim(), body);
  }

  /**
   * PATCH /v1/properties/:propertyId/tasks-alerts/:itemId
   */
  @Patch(':itemId')
  patchItem(
    @Param('propertyId') propertyId: string,
    @Param('itemId') itemId: string,
    @Body() body: PatchTaskAlertDto,
  ) {
    return this.tasksAlertsService.patchItem(
      propertyId.trim(),
      itemId.trim(),
      body,
    );
  }
}
