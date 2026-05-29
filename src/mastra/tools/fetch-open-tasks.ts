import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb, severityRank } from '../lib/mongo';
import {
  assertPortfolioAccess,
  getAccessiblePortfolioIds,
  noAccess,
  getOrgId,
} from '../lib/rbac';

export const fetchOpenTasksTool = createTool({
  id: 'fetch-open-tasks',
  description: `Returns unresolved tasks across a portfolio (or a single property), sorted by severity. Use when the user asks "what's on my plate?", "what do I need to do?", or "show me open tasks".`,
  inputSchema: z.object({
    portfolio_id: z.string().optional(),
    property_id: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    tasks: z
      .array(
        z.object({
          itemId: z.string(),
          title: z.string(),
          details: z.string().optional(),
          severity: z.string(),
          property_id: z.string(),
          property_name: z.string().optional(),
          lease_id: z.string(),
        }),
      )
      .optional(),
    total: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id, property_id, limit } = inputData;
    try {
      const orgId = getOrgId(context);
      let scopedPortfolioIds: string[];
      if (portfolio_id) {
        if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
          return noAccess('tasks');
        }
        scopedPortfolioIds = [portfolio_id];
      } else {
        scopedPortfolioIds = await getAccessiblePortfolioIds(orgId);
        if (scopedPortfolioIds.length === 0) {
          return { success: true, tasks: [], total: 0 };
        }
      }

      const db = await getDb();
      const filter: Record<string, unknown> = {
        category: 'task',
        is_resolved: false,
        portfolio_id: { $in: scopedPortfolioIds },
      };
      if (property_id) filter.property_id = property_id;

      const docs = await db
        .collection('property_task_alerts')
        .find(filter)
        .toArray();

      const propertyIds = Array.from(
        new Set(docs.map((d) => String(d.property_id))),
      );
      const props = await db
        .collection('properties')
        .find({ propertyId: { $in: propertyIds } })
        .project({ propertyId: 1, property_name: 1 })
        .toArray();
      const nameById = new Map(
        props.map((p) => [String(p.propertyId), String(p.property_name ?? '')]),
      );

      const tasks = docs
        .map((d) => ({
          itemId: String(d.itemId),
          title: String(d.title),
          details: d.details ? String(d.details) : undefined,
          severity: String(d.severity).toLowerCase(),
          property_id: String(d.property_id),
          property_name: nameById.get(String(d.property_id)),
          lease_id: String(d.lease_id),
        }))
        .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
        .slice(0, limit);

      return { success: true, tasks, total: docs.length };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch open tasks: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
