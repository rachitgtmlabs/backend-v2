"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCamRulesTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const rbac_1 = require("../lib/rbac");
exports.fetchCamRulesTool = (0, tools_1.createTool)({
    id: 'fetch-cam-rules',
    description: "Returns the portfolio's reusable CAM rule templates (the named rules a unit's cam_allocation snapshots from — e.g. 'CAM-014 Base Year Stop'). Use this when the user asks about CAM rules, rule definitions, share %, base year, exclusions, admin fee. Filter by rule_code (e.g. 'CAM-014') or substring on rule_name when the user names a specific rule.",
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string(),
        rule_code: zod_1.z
            .string()
            .optional()
            .describe('Exact rule_code lookup (case-insensitive), e.g. "CAM-014".'),
        query: zod_1.z
            .string()
            .optional()
            .describe('Optional substring match on rule_name (case-insensitive). Use when user named a rule by description rather than code.'),
        limit: zod_1.z.number().optional(),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        count: zod_1.z.number().optional(),
        rules: zod_1.z
            .array(zod_1.z.object({
            ruleId: zod_1.z.string(),
            rule_code: zod_1.z.string(),
            rule_name: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            base_amount: zod_1.z.number().optional(),
            base_year: zod_1.z.number().optional(),
            share_pct: zod_1.z.number().optional(),
            admin_fee_pct: zod_1.z.number().nullable().optional(),
            exclusions: zod_1.z.array(zod_1.z.string()).optional(),
        }))
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const { portfolio_id, rule_code, query, limit } = inputData;
        try {
            const orgId = (0, rbac_1.getOrgId)(context);
            if (!(await (0, rbac_1.assertPortfolioAccess)(portfolio_id, orgId))) {
                return (0, rbac_1.noAccess)('CAM rules');
            }
            const db = await (0, mongo_1.getDb)();
            const filter = { portfolio_id };
            if (rule_code) {
                filter.rule_code = {
                    $regex: `^${escapeRegex(rule_code)}$`,
                    $options: 'i',
                };
            }
            else if (query) {
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
                base_amount: typeof r.base_amount === 'number' ? r.base_amount : undefined,
                base_year: typeof r.base_year === 'number' ? r.base_year : undefined,
                share_pct: typeof r.share_pct === 'number' ? r.share_pct : undefined,
                admin_fee_pct: typeof r.admin_fee_pct === 'number'
                    ? r.admin_fee_pct
                    : r.admin_fee_pct === null
                        ? null
                        : undefined,
                exclusions: Array.isArray(r.exclusions)
                    ? r.exclusions
                    : undefined,
            }));
            return { success: true, count: rules.length, rules };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch CAM rules: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=fetch-cam-rules.js.map