import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';
import { assertPortfolioAccess, noAccess, getOrgId } from '../lib/rbac';

/**
 * Audit-reconciliation history for the "Reconcile YYYY" feature.
 *
 * A run holds the diff between actual committed invoices and what the engine
 * would canonically have produced for a (property, year). Modes:
 *   preview  — diff only, append-only history record, nothing written downstream
 *   applied  — adjustment invoices created (ids in adjustments_created)
 *
 * The orchestrator hits this when the user asks things like
 *  "what was the reconciliation for Apex Tower 2024",
 *  "show last applied reconciliation",
 *  "any preview reconciliations still open".
 */
export const fetchCamReconciliationTool = createTool({
  id: 'fetch-cam-reconciliation',
  description:
    "Returns audit-reconciliation runs for a property (the 'Reconcile YYYY' history). Each run has total_delta, units_with_discrepancies, bills_affected, per-unit deltas (by_unit[]), and mode ('preview' or 'applied'). Use when the user asks about reconciliation history, the size of a CAM true-up, who owes what for a given year, or whether an apply has happened.",
  inputSchema: z.object({
    portfolio_id: z.string(),
    property_id: z
      .string()
      .optional()
      .describe('Restrict to one property. Required for runId lookups.'),
    runId: z
      .string()
      .optional()
      .describe('Exact run id — when supplied, returns just that run.'),
    calendar_year: z
      .number()
      .optional()
      .describe('Filter to a specific calendar year, e.g. 2024.'),
    mode: z
      .enum(['preview', 'applied'])
      .optional()
      .describe(
        "Filter by run mode. 'applied' = adjustment invoices were created.",
      ),
    unit_id: z
      .string()
      .optional()
      .describe('Only runs scoped to this single unit.'),
    limit: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    count: z.number().optional(),
    runs: z
      .array(
        z.object({
          runId: z.string(),
          portfolio_id: z.string(),
          property_id: z.string(),
          unit_id: z.string().nullable(),
          calendar_year: z.number(),
          mode: z.enum(['preview', 'applied']),
          triggered_by: z.string(),
          triggered_at: z.string(),
          total_delta: z.number(),
          units_with_discrepancies: z.number(),
          bills_affected: z.number(),
          by_unit: z
            .array(
              z.object({
                unit_id: z.string(),
                unit_code: z.string().nullable(),
                tenant_name: z.string().nullable(),
                actual_invoiced_total: z.number(),
                canonical_invoiced_total: z.number(),
                delta: z.number(),
                adjustment_invoiceId: z.string().nullable(),
              }),
            )
            .optional(),
          adjustments_created: z.array(z.string()).optional(),
          applied_at: z.string().nullable().optional(),
          applied_by: z.string().nullable().optional(),
          apply_reason: z.string().nullable().optional(),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const {
      portfolio_id,
      property_id,
      runId,
      calendar_year,
      mode,
      unit_id,
      limit,
    } = inputData;
    try {
      const orgId = getOrgId(context);
      if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
        return noAccess('reconciliation');
      }
      const db = await getDb();
      const filter: Record<string, unknown> = { portfolio_id };
      if (property_id) filter.property_id = property_id;
      if (runId) filter.runId = runId;
      if (typeof calendar_year === 'number')
        filter.calendar_year = calendar_year;
      if (mode) filter.mode = mode;
      if (unit_id) filter.unit_id = unit_id;

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
        mode: (r.mode === 'applied' ? 'applied' : 'preview') as
          | 'preview'
          | 'applied',
        triggered_by: String(r.triggered_by ?? ''),
        triggered_at:
          r.triggered_at instanceof Date
            ? r.triggered_at.toISOString()
            : String(r.triggered_at ?? ''),
        total_delta: Number(r.total_delta ?? 0),
        units_with_discrepancies: Number(r.units_with_discrepancies ?? 0),
        bills_affected: Number(r.bills_affected ?? 0),
        by_unit: Array.isArray(r.by_unit)
          ? r.by_unit.map((u: Record<string, unknown>) => ({
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
          ? (r.adjustments_created as string[])
          : undefined,
        applied_at:
          r.applied_at instanceof Date
            ? r.applied_at.toISOString()
            : r.applied_at
              ? String(r.applied_at)
              : null,
        applied_by: r.applied_by ? String(r.applied_by) : null,
        apply_reason: r.apply_reason ? String(r.apply_reason) : null,
      }));

      return { success: true, count: runs.length, runs };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch reconciliation runs: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
