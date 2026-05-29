"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCamReconciliationTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const rbac_1 = require("../lib/rbac");
exports.fetchCamReconciliationTool = (0, tools_1.createTool)({
    id: 'fetch-cam-reconciliation',
    description: "Returns audit-reconciliation runs for a property (the 'Reconcile YYYY' history). Each run has total_delta, units_with_discrepancies, bills_affected, per-unit deltas (by_unit[]), and mode ('preview' or 'applied'). Use when the user asks about reconciliation history, the size of a CAM true-up, who owes what for a given year, or whether an apply has happened.",
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string(),
        property_id: zod_1.z
            .string()
            .optional()
            .describe('Restrict to one property. Required for runId lookups.'),
        runId: zod_1.z
            .string()
            .optional()
            .describe('Exact run id — when supplied, returns just that run.'),
        calendar_year: zod_1.z
            .number()
            .optional()
            .describe('Filter to a specific calendar year, e.g. 2024.'),
        mode: zod_1.z
            .enum(['preview', 'applied'])
            .optional()
            .describe("Filter by run mode. 'applied' = adjustment invoices were created."),
        unit_id: zod_1.z
            .string()
            .optional()
            .describe('Only runs scoped to this single unit.'),
        limit: zod_1.z.number().optional(),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        count: zod_1.z.number().optional(),
        runs: zod_1.z
            .array(zod_1.z.object({
            runId: zod_1.z.string(),
            portfolio_id: zod_1.z.string(),
            property_id: zod_1.z.string(),
            unit_id: zod_1.z.string().nullable(),
            calendar_year: zod_1.z.number(),
            mode: zod_1.z.enum(['preview', 'applied']),
            triggered_by: zod_1.z.string(),
            triggered_at: zod_1.z.string(),
            total_delta: zod_1.z.number(),
            units_with_discrepancies: zod_1.z.number(),
            bills_affected: zod_1.z.number(),
            by_unit: zod_1.z
                .array(zod_1.z.object({
                unit_id: zod_1.z.string(),
                unit_code: zod_1.z.string().nullable(),
                tenant_name: zod_1.z.string().nullable(),
                actual_invoiced_total: zod_1.z.number(),
                canonical_invoiced_total: zod_1.z.number(),
                delta: zod_1.z.number(),
                adjustment_invoiceId: zod_1.z.string().nullable(),
            }))
                .optional(),
            adjustments_created: zod_1.z.array(zod_1.z.string()).optional(),
            applied_at: zod_1.z.string().nullable().optional(),
            applied_by: zod_1.z.string().nullable().optional(),
            apply_reason: zod_1.z.string().nullable().optional(),
        }))
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const { portfolio_id, property_id, runId, calendar_year, mode, unit_id, limit, } = inputData;
        try {
            const orgId = (0, rbac_1.getOrgId)(context);
            if (!(await (0, rbac_1.assertPortfolioAccess)(portfolio_id, orgId))) {
                return (0, rbac_1.noAccess)('reconciliation');
            }
            const db = await (0, mongo_1.getDb)();
            const filter = { portfolio_id };
            if (property_id)
                filter.property_id = property_id;
            if (runId)
                filter.runId = runId;
            if (typeof calendar_year === 'number')
                filter.calendar_year = calendar_year;
            if (mode)
                filter.mode = mode;
            if (unit_id)
                filter.unit_id = unit_id;
            const docs = await db
                .collection('reconciliation_runs')
                .find(filter)
                .sort({ createdAt: -1 })
                .limit(Math.max(1, Math.min(limit ?? 20, 100)))
                .toArray();
            const runs = docs.map((r) => ({
                runId: String(r.runId),
                portfolio_id: String(r.portfolio_id),
                property_id: String(r.property_id),
                unit_id: r.unit_id ? String(r.unit_id) : null,
                calendar_year: Number(r.calendar_year),
                mode: (r.mode === 'applied' ? 'applied' : 'preview'),
                triggered_by: String(r.triggered_by ?? ''),
                triggered_at: r.triggered_at instanceof Date
                    ? r.triggered_at.toISOString()
                    : String(r.triggered_at ?? ''),
                total_delta: Number(r.total_delta ?? 0),
                units_with_discrepancies: Number(r.units_with_discrepancies ?? 0),
                bills_affected: Number(r.bills_affected ?? 0),
                by_unit: Array.isArray(r.by_unit)
                    ? r.by_unit.map((u) => ({
                        unit_id: String(u.unit_id),
                        unit_code: u.unit_code ? String(u.unit_code) : null,
                        tenant_name: u.tenant_name ? String(u.tenant_name) : null,
                        actual_invoiced_total: Number(u.actual_invoiced_total ?? 0),
                        canonical_invoiced_total: Number(u.canonical_invoiced_total ?? 0),
                        delta: Number(u.delta ?? 0),
                        adjustment_invoiceId: u.adjustment_invoiceId
                            ? String(u.adjustment_invoiceId)
                            : null,
                    }))
                    : undefined,
                adjustments_created: Array.isArray(r.adjustments_created)
                    ? r.adjustments_created
                    : undefined,
                applied_at: r.applied_at instanceof Date
                    ? r.applied_at.toISOString()
                    : r.applied_at
                        ? String(r.applied_at)
                        : null,
                applied_by: r.applied_by ? String(r.applied_by) : null,
                apply_reason: r.apply_reason ? String(r.apply_reason) : null,
            }));
            return { success: true, count: runs.length, runs };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch reconciliation runs: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-cam-reconciliation.js.map