"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPortfoliosTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const rbac_1 = require("../lib/rbac");
exports.listPortfoliosTool = (0, tools_1.createTool)({
    id: 'list-portfolios',
    description: `Lists all portfolios (name and id). Use when the user wants the full catalog, or when search-portfolios returns no matches and you need to show what exists. For a name the user gave, prefer search-portfolios first.`,
    inputSchema: zod_1.z.object({}),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        portfolios: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            classification: zod_1.z.string().optional(),
        }))
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (_inputData, context) => {
        try {
            const orgId = (0, rbac_1.getOrgId)(context);
            const db = await (0, mongo_1.getDb)();
            const portfolios = await db
                .collection('portfolios')
                .find((0, rbac_1.orgPortfolioFilter)(orgId))
                .project({
                portfolioId: 1,
                name: 1,
                description: 1,
                classification: 1,
            })
                .toArray();
            return {
                success: true,
                portfolios: portfolios.map((p) => ({
                    id: p.portfolioId,
                    name: p.name,
                    description: p.description,
                    classification: p.classification,
                })),
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to list portfolios: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=list-portfolios.js.map