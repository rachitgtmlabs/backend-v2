import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';

import {
  TenantInvoice,
  TenantInvoiceDocumentModel,
} from '../schemas/tenant-invoice.schema';

/**
 * Stories 24/25/26 — expense category report.
 *
 *   reportByCategory  — aggregates committed tenant invoices by category,
 *                        scoped to a property OR a single unit.
 *                        Default timeline is current calendar year (25).
 *   drilldown         — invoices that make up a single category (26).
 *
 * Aggregation runs over `tenant_invoices` directly (not bills) because the
 * dollar number that matters is what the TENANT was billed, not what the
 * landlord paid the vendor.
 */
@Injectable()
export class ExpenseReportService {
  constructor(
    @InjectModel(TenantInvoice.name)
    private readonly model: Model<TenantInvoiceDocumentModel>,
  ) {}

  async reportByCategory(args: {
    portfolio_id: string;
    property_id: string;
    unit_id?: string;
    calendar_year?: number;
    from?: Date;
    to?: Date;
  }) {
    const match: Record<string, unknown> = {
      portfolio_id: args.portfolio_id,
      property_id: args.property_id,
      status: 'committed',
      invoice_kind: 'original',
    };
    if (args.unit_id) match.unit_id = args.unit_id;
    if (args.calendar_year) match.calendar_year = args.calendar_year;
    if (args.from || args.to) {
      const range: Record<string, Date> = {};
      if (args.from) range.$gte = args.from;
      if (args.to) range.$lte = args.to;
      match.committed_at = range;
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$expense_category', '(Uncategorized)'] },
          total_invoiced: { $sum: '$invoice_amount' },
          invoice_count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          total_invoiced: 1,
          invoice_count: 1,
        },
      },
      { $sort: { total_invoiced: -1 } },
    ];

    const rows = await this.model.aggregate(pipeline);
    const total = rows.reduce(
      (s: number, r: { total_invoiced: number }) => s + r.total_invoiced,
      0,
    );

    // Top vendors: join invoices (in match scope) → bills via billId,
    // group by vendor_name, sum invoiced. Adjustments excluded (billId null).
    const vendorPipeline: PipelineStage[] = [
      { $match: { ...match, billId: { $ne: null } } },
      {
        $lookup: {
          from: 'bills',
          localField: 'billId',
          foreignField: 'billId',
          as: 'bill',
          pipeline: [{ $project: { vendor_name: 1 } }],
        },
      },
      { $unwind: { path: '$bill', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$bill.vendor_name', '(Unknown vendor)'] },
          total_invoiced: { $sum: '$invoice_amount' },
          invoice_count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          vendor_name: '$_id',
          total_invoiced: 1,
          invoice_count: 1,
        },
      },
      { $sort: { total_invoiced: -1 } },
      { $limit: 10 },
    ];
    const top_vendors = await this.model.aggregate(vendorPipeline);

    return {
      total_invoiced: total,
      categories: rows,
      top_vendors,
      scope: args.unit_id
        ? { kind: 'unit', unit_id: args.unit_id }
        : { kind: 'property', property_id: args.property_id },
      timeline: {
        calendar_year: args.calendar_year ?? null,
        from: args.from ?? null,
        to: args.to ?? null,
      },
    };
  }

  /** Story 26 — drill into a single category's invoices. */
  async drilldown(args: {
    portfolio_id: string;
    property_id: string;
    category: string;
    unit_id?: string;
    calendar_year?: number;
  }) {
    const q: Record<string, unknown> = {
      portfolio_id: args.portfolio_id,
      property_id: args.property_id,
      status: 'committed',
      invoice_kind: 'original',
      expense_category: args.category,
    };
    if (args.unit_id) q.unit_id = args.unit_id;
    if (args.calendar_year) q.calendar_year = args.calendar_year;
    return this.model
      .find(q)
      .sort({ committed_at: -1 })
      .limit(500)
      .lean();
  }
}
