"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAmendmentHistoryTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const rbac_1 = require("../lib/rbac");
function flatten(obj, prefix = '') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v !== null &&
            typeof v === 'object' &&
            !Array.isArray(v) &&
            Object.getPrototypeOf(v) === Object.prototype) {
            Object.assign(out, flatten(v, key));
        }
        else {
            out[key] = v;
        }
    }
    return out;
}
exports.fetchAmendmentHistoryTool = (0, tools_1.createTool)({
    id: 'fetch-amendment-history',
    description: `Returns a flat, field-level change log across all amendments for a lease. Use when the user asks "when did X change?" — e.g. "when was the rent last changed?", "has the security deposit ever been amended?".`,
    inputSchema: zod_1.z.object({
        lease_id: zod_1.z.string().describe('Lease id (les_*)'),
        fieldFilter: zod_1.z
            .string()
            .optional()
            .describe('Optional substring to filter field paths (case-insensitive), e.g. "rent", "cam", "expiration".'),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        changes: zod_1.z
            .array(zod_1.z.object({
            field: zod_1.z.string(),
            fromVersion: zod_1.z.number(),
            fromValue: zod_1.z.unknown(),
            toVersion: zod_1.z.number(),
            toValue: zod_1.z.unknown(),
            updated_at: zod_1.z.string(),
            amendmentId: zod_1.z.string(),
        }))
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const { lease_id, fieldFilter } = inputData;
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
            let current = flatten((lease.lease_information ?? {}));
            const changes = [];
            let prevVersion = 0;
            for (const a of amendments) {
                const v = Number(a.version);
                const delta = flatten((a.lease_information ?? {}));
                for (const [k, v2] of Object.entries(delta)) {
                    const fromValue = current[k];
                    if (JSON.stringify(fromValue) === JSON.stringify(v2))
                        continue;
                    changes.push({
                        field: k,
                        fromVersion: prevVersion,
                        fromValue,
                        toVersion: v,
                        toValue: v2,
                        updated_at: a.updatedAt instanceof Date
                            ? a.updatedAt.toISOString()
                            : String(a.updatedAt ?? ''),
                        amendmentId: String(a.amendmentId),
                    });
                    current[k] = v2;
                }
                prevVersion = v;
            }
            const filtered = fieldFilter
                ? changes.filter((c) => c.field.toLowerCase().includes(fieldFilter.toLowerCase()))
                : changes;
            return { success: true, changes: filtered };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch amendment history: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-amendment-history.js.map