import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { Lease, LeaseDocumentModel } from '../lease/schemas/lease.schema';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PropertyService } from '../property/property.service';
import { CreateTaskAlertDto } from './dto/create-task-alert.dto';
import { PatchTaskAlertDto } from './dto/patch-task-alert.dto';
import {
  PropertyAlert,
  PropertyAlertDocumentModel,
} from './schemas/property-alert.schema';
import {
  TaskAlert,
  TaskAlertDocumentModel,
  TaskAlertSeverity,
} from './schemas/task-alert.schema';

function newTaskItemId(): string {
  return `tka_${randomBytes(6).toString('hex')}`;
}

function newAlertItemId(): string {
  return `ala_${randomBytes(6).toString('hex')}`;
}

const SEVERITY_ORDER: TaskAlertSeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
];

function severityRank(severity: string): number {
  const i = SEVERITY_ORDER.indexOf(severity as TaskAlertSeverity);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

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

type TaskAlertRowSource = {
  itemId: string;
  title: string;
  severity: TaskAlertSeverity;
  is_resolved?: boolean;
  details?: string;
  sortOrder?: number | null;
  alert_type?: string;
  due_timeline?: string;
  suggested_action?: string;
};

@Injectable()
export class TasksAlertsService {
  constructor(
    @InjectModel(PropertyAlert.name)
    private readonly propertyAlertModel: Model<PropertyAlertDocumentModel>,
    @InjectModel(TaskAlert.name)
    private readonly taskAlertModel: Model<TaskAlertDocumentModel>,
    @InjectModel(Lease.name)
    private readonly leaseModel: Model<LeaseDocumentModel>,
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService,
  ) {}

  private async assertPortfolioAndProperty(
    portfolioId: string,
    propertyId: string,
  ): Promise<void> {
    const exists = await this.portfolioService.existsByPortfolioId(portfolioId);
    if (!exists) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }
    const propertyOk = await this.propertyService.belongsToPortfolio(
      propertyId,
      portfolioId,
    );
    if (!propertyOk) {
      throw new NotFoundException(
        `Property not found in portfolio: ${propertyId}`,
      );
    }
  }

  private async resolveLeaseId(
    portfolioId: string,
    propertyId: string,
    leaseId: string | undefined,
  ): Promise<string> {
    if (leaseId) {
      const lease = await this.leaseModel
        .findOne({
          leaseId,
          portfolio_id: portfolioId,
          property_id: propertyId,
        })
        .exec();
      if (!lease) {
        throw new NotFoundException(
          `Lease ${leaseId} not found for this portfolio and property.`,
        );
      }
      return lease.leaseId;
    }

    const lease = await this.leaseModel
      .findOne({
        portfolio_id: portfolioId,
        property_id: propertyId,
      })
      .sort({ updatedAt: -1 })
      .exec();

    if (!lease) {
      throw new NotFoundException(
        'No saved lease analysis for this property.',
      );
    }
    return lease.leaseId;
  }

  private mapToRowDto(doc: TaskAlertRowSource): TaskAlertRowDto {
    return {
      id: doc.itemId,
      title: doc.title,
      severity: doc.severity,
      is_resolved: doc.is_resolved === true,
      ...(doc.details != null && doc.details !== ''
        ? { details: doc.details }
        : {}),
      ...(doc.sortOrder !== undefined && doc.sortOrder !== null
        ? { sortOrder: doc.sortOrder }
        : {}),
      ...(doc.alert_type != null && String(doc.alert_type).trim() !== ''
        ? { alert_type: String(doc.alert_type).trim() }
        : {}),
      ...(doc.due_timeline != null && String(doc.due_timeline).trim() !== ''
        ? { due_timeline: String(doc.due_timeline).trim() }
        : {}),
      ...(doc.suggested_action != null &&
      String(doc.suggested_action).trim() !== ''
        ? { suggested_action: String(doc.suggested_action).trim() }
        : {}),
    };
  }

  private sortAlertRows(rows: TaskAlertRowDto[]): TaskAlertRowDto[] {
    return [...rows].sort((a, b) => {
      const ar = a.is_resolved ? 1 : 0;
      const br = b.is_resolved ? 1 : 0;
      if (ar !== br) return ar - br;
      const sr = severityRank(a.severity) - severityRank(b.severity);
      if (sr !== 0) return sr;
      const ao = a.sortOrder ?? 1e9;
      const bo = b.sortOrder ?? 1e9;
      return ao - bo;
    });
  }

  private sortTaskRows(rows: TaskAlertRowDto[]): TaskAlertRowDto[] {
    return [...rows].sort((a, b) => {
      const ar = a.is_resolved ? 1 : 0;
      const br = b.is_resolved ? 1 : 0;
      if (ar !== br) return ar - br;
      const sr = severityRank(a.severity) - severityRank(b.severity);
      if (sr !== 0) return sr;
      const ao = a.sortOrder ?? 1e9;
      const bo = b.sortOrder ?? 1e9;
      return ao - bo;
    });
  }

  async findGrouped(
    portfolioId: string,
    propertyId: string,
    leaseId: string | undefined,
  ): Promise<{ alerts: TaskAlertRowDto[]; tasks: TaskAlertRowDto[] }> {
    await this.assertPortfolioAndProperty(portfolioId, propertyId);
    const resolvedLeaseId = await this.resolveLeaseId(
      portfolioId,
      propertyId,
      leaseId,
    );

    const [alertsNew, alertsLegacy, taskDocs] = await Promise.all([
      this.propertyAlertModel
        .find({
          portfolio_id: portfolioId,
          property_id: propertyId,
          lease_id: resolvedLeaseId,
        })
        .lean()
        .exec(),
      this.taskAlertModel
        .find({
          portfolio_id: portfolioId,
          property_id: propertyId,
          lease_id: resolvedLeaseId,
          category: 'alert',
        })
        .lean()
        .exec(),
      this.taskAlertModel
        .find({
          portfolio_id: portfolioId,
          property_id: propertyId,
          lease_id: resolvedLeaseId,
          category: 'task',
        })
        .lean()
        .exec(),
    ]);

    const alerts: TaskAlertRowDto[] = [
      ...alertsNew.map((row) =>
        this.mapToRowDto(row as unknown as TaskAlertRowSource),
      ),
      ...alertsLegacy.map((row) =>
        this.mapToRowDto(row as unknown as TaskAlertRowSource),
      ),
    ];
    const tasks: TaskAlertRowDto[] = taskDocs.map((row) =>
      this.mapToRowDto(row as unknown as TaskAlertRowSource),
    );

    return {
      alerts: this.sortAlertRows(alerts),
      tasks: this.sortTaskRows(tasks),
    };
  }

  async create(
    propertyIdFromRoute: string,
    dto: CreateTaskAlertDto,
  ): Promise<{ item: TaskAlertRowDto }> {
    await this.resolveLeaseId(
      dto.portfolio_id.trim(),
      propertyIdFromRoute.trim(),
      dto.lease_id.trim(),
    );

    if (dto.category === 'alert') {
      const doc = await this.propertyAlertModel.create({
        itemId: newAlertItemId(),
        portfolio_id: dto.portfolio_id.trim(),
        property_id: propertyIdFromRoute.trim(),
        lease_id: dto.lease_id.trim(),
        title: dto.title.trim(),
        ...(dto.details != null && dto.details.trim() !== ''
          ? { details: dto.details.trim() }
          : {}),
        severity: dto.severity ?? 'medium',
        is_resolved: dto.is_resolved === true,
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.alert_type != null && dto.alert_type.trim() !== ''
          ? { alert_type: dto.alert_type.trim() }
          : {}),
        ...(dto.due_timeline != null && dto.due_timeline.trim() !== ''
          ? { due_timeline: dto.due_timeline.trim() }
          : {}),
        ...(dto.suggested_action != null && dto.suggested_action.trim() !== ''
          ? { suggested_action: dto.suggested_action.trim() }
          : {}),
      });
      return { item: this.mapToRowDto(doc.toObject() as TaskAlertRowSource) };
    }

    const doc = await this.taskAlertModel.create({
      itemId: newTaskItemId(),
      portfolio_id: dto.portfolio_id.trim(),
      property_id: propertyIdFromRoute.trim(),
      lease_id: dto.lease_id.trim(),
      category: 'task',
      title: dto.title.trim(),
      ...(dto.details != null && dto.details.trim() !== ''
        ? { details: dto.details.trim() }
        : {}),
      severity: dto.severity ?? 'medium',
      is_resolved: dto.is_resolved === true,
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    return { item: this.mapToRowDto(doc.toObject() as TaskAlertRowSource) };
  }

  async patchItem(
    propertyIdFromRoute: string,
    itemId: string,
    dto: PatchTaskAlertDto,
  ): Promise<{ item: TaskAlertRowDto }> {
    await this.assertPortfolioAndProperty(
      dto.portfolio_id.trim(),
      propertyIdFromRoute.trim(),
    );
    const resolvedLeaseId = await this.resolveLeaseId(
      dto.portfolio_id.trim(),
      propertyIdFromRoute.trim(),
      dto.lease_id.trim(),
    );

    const filter = {
      itemId,
      portfolio_id: dto.portfolio_id.trim(),
      property_id: propertyIdFromRoute.trim(),
      lease_id: resolvedLeaseId,
    };

    let doc =
      (await this.propertyAlertModel
        .findOneAndUpdate(
          filter,
          { $set: { is_resolved: dto.is_resolved } },
          { new: true },
        )
        .exec()) ?? null;

    if (!doc) {
      doc = await this.taskAlertModel
        .findOneAndUpdate(
          filter,
          { $set: { is_resolved: dto.is_resolved } },
          { new: true },
        )
        .exec();
    }

    if (!doc) {
      throw new NotFoundException('Task or alert item not found for this lease.');
    }

    return { item: this.mapToRowDto(doc.toObject() as TaskAlertRowSource) };
  }

  /**
   * Sample rows for a newly saved lease (vault Tasks tab).
   */
  async seedForNewLease(
    portfolioId: string,
    propertyId: string,
    leaseId: string,
    unitId: string | null = null,
  ): Promise<void> {
    const alertSeeds: Array<{
      severity: TaskAlertSeverity;
      title: string;
      sortOrder: number;
      details?: string;
    }> = [
      {
        severity: 'high',
        sortOrder: 0,
        title:
          'Reconcile CAM pool definitions and caps against the landlord annual expense statement before the audit deadline.',
      },
      {
        severity: 'medium',
        sortOrder: 1,
        title:
          'Confirm whether the expense stop applies to controllable CAM only and matches any letter of intent.',
      },
      {
        severity: 'low',
        sortOrder: 2,
        title:
          'Track reconciliation delivery timing — many leases allow 120–180 days after fiscal year-end.',
      },
      {
        severity: 'medium',
        sortOrder: 3,
        title:
          'Verify gross-up and vacancy assumptions used for CAM allocations match lease formulas.',
      },
    ];

    await this.propertyAlertModel.insertMany(
      alertSeeds.map((s) => ({
        itemId: newAlertItemId(),
        portfolio_id: portfolioId,
        property_id: propertyId,
        lease_id: leaseId,
        unit_id: unitId,
        title: s.title,
        severity: s.severity,
        sortOrder: s.sortOrder,
        is_resolved: false,
        ...(s.details ? { details: s.details } : {}),
      })),
    );
  }
}
