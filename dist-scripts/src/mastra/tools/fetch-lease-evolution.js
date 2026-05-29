"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLeaseEvolutionTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const rbac_1 = require("../lib/rbac");
exports.fetchLeaseEvolutionTool = (0, tools_1.createTool)({
    id: 'fetch-lease-evolution',
    description: `Returns the timeline of how a lease evolved: original lease plus each amendment, with the list of changed sections in each amendment and the date. Use when the user asks how a lease changed over time, what amendments did, or wants a chronological view of a lease.`,
    inputSchema: zod_1.z.object({
        lease_id: zod_1.z.string().describe('Lease id (les_*)'),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        lease: zod_1.z
            .object({
            lease_id: zod_1.z.string(),
            file_name: zod_1.z.string(),
            status: zod_1.z.string(),
            created_at: zod_1.z.string(),
            initialSections: zod_1.z.array(zod_1.z.string()),
        })
            .optional(),
        timeline: zod_1.z
            .array(zod_1.z.object({
            version: zod_1.z.number(),
            amendmentId: zod_1.z.string(),
            file_name: zod_1.z.string(),
            status: zod_1.z.string(),
            changedSections: zod_1.z.array(zod_1.z.string()),
            changedFields: zod_1.z.array(zod_1.z.string()),
            updated_at: zod_1.z.string(),
        }))
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const { lease_id } = inputData;
        try {
            const orgId = (0, rbac_1.getOrgId)(context);
            const db = await (0, mongo_1.getDb)();
            const lease = await db.collection('leases').findOne({ leaseId: lease_id });
            if (!lease) {
                return { success: false, error: `Lease not found: ${lease_id}` };
            }
            if (!(await (0, rbac_1.assertPortfolioAccess)(String(lease.portfolio_id), orgId))) {
                return (0, rbac_1.noAccess)('lease');
            }
            const amendments = await db
                .collection('amendments')
                .find({ lease_id })
                .sort({ version: 1 })
                .toArray();
            const initialSections = Object.keys((lease.analysis ?? {}));
            const timeline = amendments.map((a) => ({
                version: Number(a.version),
                amendmentId: String(a.amendmentId),
                file_name: String(a.file_name),
                status: String(a.status),
                changedSections: Object.keys((a.analysis ?? {})),
                changedFields: Object.keys((a.lease_information ?? {})),
                updated_at: a.updatedAt instanceof Date
                    ? a.updatedAt.toISOString()
                    : String(a.updatedAt ?? ''),
            }));
            return {
                success: true,
                lease: {
                    lease_id: String(lease.leaseId),
                    file_name: String(lease.file_name),
                    status: String(lease.status),
                    created_at: lease.createdAt instanceof Date
                        ? lease.createdAt.toISOString()
                        : String(lease.createdAt ?? ''),
                    initialSections,
                },
                timeline,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch lease evolution: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-lease-evolution.js.map