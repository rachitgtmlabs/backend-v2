import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';
import { assertPortfolioAccess, noAccess, getOrgId } from '../lib/rbac';

export const fetchCamRulesTool = createTool({
  id: 'fetch-cam-rules',
  description:
    "Returns the portfolio's reusable CAM rule templates (the named rules a unit's cam_allocation snapshots from — e.g. 'CAM-014 Base Year Stop'). Use this when the user asks about CAM rules, rule definitions, share %, base year, exclusions, admin fee. Filter by rule_code (e.g. 'CAM-014') or substring on rule_name when the user names a specific rule.",
  inputSchema: z.object({
    portfolio_id: z.string(),
    rule_code: z
      .string()
      .optional()
      .describe('Exact rule_code lookup (case-insensitive), e.g. "CAM-014".'),
    query: z
      .string()
      .optional()
      .describe(
        'Optional substring match on rule_name (case-insensitive). Use when user named a rule by description rather than code.',
      ),
    limit: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    count: z.number().optional(),
    rules: z
      .array(
        z.object({
          ruleId: z.string(),
          rule_code: z.string(),
          rule_name: z.string(),
          description: z.string().optional(),
          base_amount: z.number().optional(),
          base_year: z.number().optional(),
          share_pct: z.number().optional(),
          admin_fee_pct: z.number().nullable().optional(),
          exclusions: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id, rule_code, query, limit } = inputData;
    try {
      const orgId = getOrgId(context);
      if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
        return noAccess('CAM rules');
      }
      const db = await getDb();
      const filter: Record<string, unknown> = { portfolio_id };
      if (rule_code) {
        filter.rule_code = {
          $regex: `^${escapeRegex(rule_code)}$`,
          $options: 'i',
        };
      } else if (query) {
        filter.$or = [
          { rule_name: { $regex: escapeRegex(query), $options: 'i' } },
          { description: { $regex: escapeRegex(query), $options: 'i' } },
        ];
      }

      const docs = await db
        .collection('cam_rules')
        .find(filter)
        .sort({ rule_code: 1 })
        .limit(Math.max(1, Math.min(limit ?? 50, 200)))
        .toArray();

      const rules = docs.map((r) => ({
        ruleId: String(r.ruleId),
        rule_code: String(r.rule_code),
        rule_name: String(r.rule_name),
        description: r.description ? String(r.description) : undefined,
        base_amount:
          typeof r.base_amount === 'number' ? r.base_amount : undefined,
        base_year: typeof r.base_year === 'number' ? r.base_year : undefined,
        share_pct: typeof r.share_pct === 'number' ? r.share_pct : undefined,
        admin_fee_pct:
          typeof r.admin_fee_pct === 'number'
            ? r.admin_fee_pct
            : r.admin_fee_pct === null
              ? null
              : undefined,
        exclusions: Array.isArray(r.exclusions)
          ? (r.exclusions as string[])
          : undefined,
      }));

      return { success: true, count: rules.length, rules };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch CAM rules: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
