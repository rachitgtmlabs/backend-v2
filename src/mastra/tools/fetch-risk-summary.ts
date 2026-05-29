import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb, severityRank } from '../lib/mongo';
import {
  assertPortfolioAccess,
  getAccessiblePortfolioIds,
  noAccess,
  getOrgId,
} from '../lib/rbac';

export const fetchRiskSummaryTool = createTool({
  id: 'fetch-risk-summary',
  description: `Returns all unresolved high/critical risks across a portfolio (or a specific property), grouped by property. Use when the user asks "what are my biggest risks?", "what's exposed?", or wants a risk overview.`,
  inputSchema: z.object({
    portfolio_id: z.string().optional().describe('Portfolio id (optional).'),
    property_id: z
      .string()
      .optional()
      .describe('Property id (optional) — scope risks to a single property.'),
    minSeverity: z
      .enum(['critical', 'high', 'medium', 'low'])
      .default('high')
      .describe('Minimum severity to include (default high).'),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    risks: z
      .array(
        z.object({
          itemId: z.string(),
          title: z.string(),
          details: z.string().optional(),
          severity: z.string(),
          property_id: z.string(),
          property_name: z.string().optional(),
          lease_id: z.string(),
          alert_type: z.string().optional(),
          due_timeline: z.string().optional(),
          suggested_action: z.string().optional(),
        }),
      )
      .optional(),
    countsBySeverity: z
      .object({
        critical: z.number(),
        high: z.number(),
        medium: z.number(),
        low: z.number(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id, property_id, minSeverity, limit } = inputData;
    try {
      const orgId = getOrgId(context);
      let scopedPortfolioIds: string[];
      if (portfolio_id) {
        if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
          return noAccess('risks');
        }
        scopedPortfolioIds = [portfolio_id];
      } else {
        scopedPortfolioIds = await getAccessiblePortfolioIds(orgId);
        if (scopedPortfolioIds.length === 0) {
          return {
            success: true,
            risks: [],
            countsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          };
        }
      }

      const db = await getDb();
      const filter: Record<string, unknown> = {
        is_resolved: false,
        portfolio_id: { $in: scopedPortfolioIds },
      };
      if (property_id) filter.property_id = property_id;

      const [alertsNew, alertsLegacy] = await Promise.all([
        db.collection('property_alerts').find(filter).toArray(),
        db
          .collection('property_task_alerts')
          .find({ ...filter, category: 'alert' })
          .toArray(),
      ]);

      const all = [...alertsNew, ...alertsLegacy];
      const minRank = severityRank(minSeverity);

      const propertyIds = Array.from(
        new Set(all.map((a) => String(a.property_id))),
      );
      const props = await db
        .collection('properties')
        .find({ propertyId: { $in: propertyIds } })
        .project({ propertyId: 1, property_name: 1 })
        .toArray();
      const nameById = new Map(
        props.map((p) => [String(p.propertyId), String(p.property_name ?? '')]),
      );

      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      const filtered = all
        .filter((a) => severityRank(String(a.severity)) <= minRank)
        .map((a) => {
          const sev = String(a.severity).toLowerCase();
          if (sev in counts) counts[sev as keyof typeof counts]++;
          return {
            itemId: String(a.itemId),
            title: String(a.title),
            details: a.details ? String(a.details) : undefined,
            severity: sev,
            property_id: String(a.property_id),
            property_name: nameById.get(String(a.property_id)),
            lease_id: String(a.lease_id),
            alert_type: a.alert_type ? String(a.alert_type) : undefined,
            due_timeline: a.due_timeline
              ? String(a.due_timeline)
              : undefined,
            suggested_action: a.suggested_action
              ? String(a.suggested_action)
              : undefined,
          };
        })
        .sort(
          (a, b) => severityRank(a.severity) - severityRank(b.severity),
        )
        .slice(0, limit);

      return { success: true, risks: filtered, countsBySeverity: counts };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch risk summary: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
