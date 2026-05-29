"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCamDataTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const CAM_KEYS_REGEX = /cam|common[_ ]area|operating[_ ]expense|opex/i;
function pickCamFields(info) {
    const out = {};
    for (const [k, v] of Object.entries(info)) {
        if (CAM_KEYS_REGEX.test(k))
            out[k] = v;
    }
    return out;
}
exports.fetchCamDataTool = (0, tools_1.createTool)({
    id: 'fetch-cam-data',
    description: `Returns CAM (Common Area Maintenance) clause data extracted from a lease (caps, base year, recovery terms) plus any open CAM-tagged alerts. NOTE: actual billed-vs-entitled reconciliation (the "$92K under-billed" number) requires a billing/payments collection that does not yet exist — that field is returned as unavailable.`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string(),
        property_id: zod_1.z.string(),
        lease_id: zod_1.z
            .string()
            .optional()
            .describe('Lease id; omit to use the latest lease for this property.'),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        lease_id: zod_1.z.string().optional(),
        camClauses: zod_1.z.record(zod_1.z.unknown()).optional(),
        camAlerts: zod_1.z
            .array(zod_1.z.object({
            itemId: zod_1.z.string(),
            title: zod_1.z.string(),
            severity: zod_1.z.string(),
            details: zod_1.z.string().optional(),
            alert_type: zod_1.z.string().optional(),
        }))
            .optional(),
        recoveryReconciliation: zod_1.z
            .object({
            available: zod_1.z.boolean(),
            note: zod_1.z.string(),
        })
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData) => {
        const { portfolio_id, property_id, lease_id: leaseIdInput } = inputData;
        try {
            const db = await (0, mongo_1.getDb)();
            let lease;
            if (leaseIdInput) {
                lease = await db
                    .collection('leases')
                    .findOne({ leaseId: leaseIdInput, portfolio_id, property_id });
            }
            else {
                lease = await db
                    .collection('leases')
                    .find({ portfolio_id, property_id })
                    .sort({ updatedAt: -1 })
                    .limit(1)
                    .next();
            }
            if (!lease) {
                return {
                    success: false,
                    error: 'No lease found for this property.',
                };
            }
            const lease_id = String(lease.leaseId);
            const [amendments, alertsNew, alertsLegacy] = await Promise.all([
                db
                    .collection('amendments')
                    .find({ lease_id })
                    .sort({ version: 1 })
                    .toArray(),
                db
                    .collection('property_alerts')
                    .find({ portfolio_id, property_id, lease_id })
                    .toArray(),
                db
                    .collection('property_task_alerts')
                    .find({
                    portfolio_id,
                    property_id,
                    lease_id,
                    category: 'alert',
                })
                    .toArray(),
            ]);
            let info = { ...(lease.lease_information ?? {}) };
            for (const a of amendments) {
                if (a.lease_information) {
                    info = (0, mongo_1.deepMerge)(info, a.lease_information);
                }
            }
            const camClauses = pickCamFields(info);
            const camAlerts = [...alertsNew, ...alertsLegacy]
                .filter((a) => {
                const t = String(a.alert_type ?? '').toLowerCase();
                const title = String(a.title ?? '').toLowerCase();
                return (t.includes('cam') ||
                    t.includes('operating') ||
                    title.includes('cam'));
            })
                .map((a) => ({
                itemId: String(a.itemId),
                title: String(a.title),
                severity: String(a.severity).toLowerCase(),
                details: a.details ? String(a.details) : undefined,
                alert_type: a.alert_type ? String(a.alert_type) : undefined,
            }));
            return {
                success: true,
                lease_id,
                camClauses,
                camAlerts,
                recoveryReconciliation: {
                    available: false,
                    note: 'Billed-vs-entitled CAM reconciliation requires a billing/payments collection that is not yet available. This will be supported soon.',
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch CAM data: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-cam-data.js.map