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
exports.ExpenseReportService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const tenant_invoice_schema_1 = require("../schemas/tenant-invoice.schema");
let ExpenseReportService = class ExpenseReportService {
    constructor(model) {
        this.model = model;
    }
    async reportByCategory(args) {
        const match = {
            portfolio_id: args.portfolio_id,
            property_id: args.property_id,
            status: 'committed',
            invoice_kind: 'original',
        };
        if (args.unit_id)
            match.unit_id = args.unit_id;
        if (args.calendar_year)
            match.calendar_year = args.calendar_year;
        if (args.from || args.to) {
            const range = {};
            if (args.from)
                range.$gte = args.from;
            if (args.to)
                range.$lte = args.to;
            match.committed_at = range;
        }
        const pipeline = [
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
        const total = rows.reduce((s, r) => s + r.total_invoiced, 0);
        const vendorPipeline = [
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
    async drilldown(args) {
        const q = {
            portfolio_id: args.portfolio_id,
            property_id: args.property_id,
            status: 'committed',
            invoice_kind: 'original',
            expense_category: args.category,
        };
        if (args.unit_id)
            q.unit_id = args.unit_id;
        if (args.calendar_year)
            q.calendar_year = args.calendar_year;
        return this.model
            .find(q)
            .sort({ committed_at: -1 })
            .limit(500)
            .lean();
    }
};
exports.ExpenseReportService = ExpenseReportService;
exports.ExpenseReportService = ExpenseReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(tenant_invoice_schema_1.TenantInvoice.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ExpenseReportService);
//# sourceMappingURL=expense-report.service.js.map