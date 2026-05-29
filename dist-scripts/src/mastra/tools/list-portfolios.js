"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPortfoliosTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const connectionString = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/lease_iq';
let cachedConnection = null;
async function getConnection() {
    if (cachedConnection?.connection?.readyState === 1) {
        return cachedConnection;
    }
    cachedConnection = await mongoose_1.default.connect(connectionString);
    return cachedConnection;
}
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
    execute: async () => {
        try {
            const conn = await getConnection();
            const db = conn.connection.db;
            if (!db) {
                return { success: false, error: 'Database connection not available' };
            }
            const portfoliosCollection = db.collection('portfolios');
            const portfolios = await portfoliosCollection
                .find({})
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