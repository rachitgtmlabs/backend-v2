"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRiskSummaryTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
exports.fetchRiskSummaryTool = (0, tools_1.createTool)({
    id: 'fetch-risk-summary',
    description: `Returns all unresolved high/critical risks across a portfolio (or a specific property), grouped by property. Use when the user asks "what are my biggest risks?", "what's exposed?", or wants a risk overview.`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string().optional().describe('Portfolio id (optional).'),
        property_id: zod_1.z
            .string()
            .optional()
            .describe('Property id (optional) — scope risks to a single property.'),
        minSeverity: zod_1.z
            .enum(['critical', 'high', 'medium', 'low'])
            .default('high')
            .describe('Minimum severity to include (default high).'),
        limit: zod_1.z.number().int().min(1).max(100).default(50),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        risks: zod_1.z
            .array(zod_1.z.object({
            itemId: zod_1.z.string(),
            title: zod_1.z.string(),
            details: zod_1.z.string().optional(),
            severity: zod_1.z.string(),
            property_id: zod_1.z.string(),
            property_name: zod_1.z.string().optional(),
            lease_id: zod_1.z.string(),
            alert_type: zod_1.z.string().optional(),
            due_timeline: zod_1.z.string().optional(),
            suggested_action: zod_1.z.string().optional(),
        }))
            .optional(),
        countsBySeverity: zod_1.z
            .object({
            critical: zod_1.z.number(),
            high: zod_1.z.number(),
            medium: zod_1.z.number(),
            low: zod_1.z.number(),
        })
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData) => {
        const { portfolio_id, property_id, minSeverity, limit } = inputData;
        try {
            const db = await (0, mongo_1.getDb)();
            const filter = { is_resolved: false };
            if (portfolio_id)
                filter.portfolio_id = portfolio_id;
            if (property_id)
                filter.property_id = property_id;
            const [alertsNew, alertsLegacy] = await Promise.all([
                db.collection('property_alerts').find(filter).toArray(),
                db
                    .collection('property_task_alerts')
                    .find({ ...filter, category: 'alert' })
                    .toArray(),
            ]);
            const all = [...alertsNew, ...alertsLegacy];
            const minRank = (0, mongo_1.severityRank)(minSeverity);
            const propertyIds = Array.from(new Set(all.map((a) => String(a.property_id))));
            const props = await db
                .collection('properties')
                .find({ propertyId: { $in: propertyIds } })
                .project({ propertyId: 1, property_name: 1 })
                .toArray();
            const nameById = new Map(props.map((p) => [String(p.propertyId), String(p.property_name ?? '')]));
            const counts = { critical: 0, high: 0, medium: 0, low: 0 };
            const filtered = all
                .filter((a) => (0, mongo_1.severityRank)(String(a.severity)) <= minRank)
                .map((a) => {
                const sev = String(a.severity).toLowerCase();
                if (sev in counts)
                    counts[sev]++;
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
                .sort((a, b) => (0, mongo_1.severityRank)(a.severity) - (0, mongo_1.severityRank)(b.severity))
                .slice(0, limit);
            return { success: true, risks: filtered, countsBySeverity: counts };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch risk summary: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-risk-summary.js.map