"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOpenTasksTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
exports.fetchOpenTasksTool = (0, tools_1.createTool)({
    id: 'fetch-open-tasks',
    description: `Returns unresolved tasks across a portfolio (or a single property), sorted by severity. Use when the user asks "what's on my plate?", "what do I need to do?", or "show me open tasks".`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string().optional(),
        property_id: zod_1.z.string().optional(),
        limit: zod_1.z.number().int().min(1).max(100).default(50),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        tasks: zod_1.z
            .array(zod_1.z.object({
            itemId: zod_1.z.string(),
            title: zod_1.z.string(),
            details: zod_1.z.string().optional(),
            severity: zod_1.z.string(),
            property_id: zod_1.z.string(),
            property_name: zod_1.z.string().optional(),
            lease_id: zod_1.z.string(),
        }))
            .optional(),
        total: zod_1.z.number().optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData) => {
        const { portfolio_id, property_id, limit } = inputData;
        try {
            const db = await (0, mongo_1.getDb)();
            const filter = {
                category: 'task',
                is_resolved: false,
            };
            if (portfolio_id)
                filter.portfolio_id = portfolio_id;
            if (property_id)
                filter.property_id = property_id;
            const docs = await db
                .collection('property_task_alerts')
                .find(filter)
                .toArray();
            const propertyIds = Array.from(new Set(docs.map((d) => String(d.property_id))));
            const props = await db
                .collection('properties')
                .find({ propertyId: { $in: propertyIds } })
                .project({ propertyId: 1, property_name: 1 })
                .toArray();
            const nameById = new Map(props.map((p) => [String(p.propertyId), String(p.property_name ?? '')]));
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
                .sort((a, b) => (0, mongo_1.severityRank)(a.severity) - (0, mongo_1.severityRank)(b.severity))
                .slice(0, limit);
            return { success: true, tasks, total: docs.length };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch open tasks: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-open-tasks.js.map