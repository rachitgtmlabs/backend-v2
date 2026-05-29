"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchExpiringLeasesTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const DATE_KEYS = [
    'lease_end_date',
    'expiration_date',
    'lease_expiration',
    'end_date',
    'term_end_date',
];
function findEndDate(info) {
    for (const k of DATE_KEYS) {
        const v = info[k];
        if (typeof v === 'string' && v) {
            const t = Date.parse(v);
            if (!isNaN(t))
                return v;
        }
    }
    return null;
}
exports.fetchExpiringLeasesTool = (0, tools_1.createTool)({
    id: 'fetch-expiring-leases',
    description: `Returns leases expiring within a window (default next 12 months), sorted by urgency. Looks at the effective lease state (lease + amendments merged). Use when the user asks "what leases expire soon", "what's coming up next year", or about renewal pressure.`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string().optional(),
        property_id: zod_1.z.string().optional(),
        withinDays: zod_1.z
            .number()
            .int()
            .min(1)
            .max(3650)
            .default(365)
            .describe('Window in days from today.'),
        limit: zod_1.z.number().int().min(1).max(100).default(50),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        leases: zod_1.z
            .array(zod_1.z.object({
            lease_id: zod_1.z.string(),
            property_id: zod_1.z.string(),
            property_name: zod_1.z.string().optional(),
            file_name: zod_1.z.string(),
            end_date: zod_1.z.string(),
            days_to_expiry: zod_1.z.number(),
        }))
            .optional(),
        total: zod_1.z.number().optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData) => {
        const { portfolio_id, property_id, withinDays, limit } = inputData;
        try {
            const db = await (0, mongo_1.getDb)();
            const filter = { status: 'processed' };
            if (portfolio_id)
                filter.portfolio_id = portfolio_id;
            if (property_id)
                filter.property_id = property_id;
            const leases = await db.collection('leases').find(filter).toArray();
            const leaseIds = leases.map((l) => String(l.leaseId));
            const amendments = leaseIds.length
                ? await db
                    .collection('amendments')
                    .find({ lease_id: { $in: leaseIds } })
                    .sort({ version: 1 })
                    .toArray()
                : [];
            const amendsByLease = new Map();
            for (const a of amendments) {
                const id = String(a.lease_id);
                if (!amendsByLease.has(id))
                    amendsByLease.set(id, []);
                amendsByLease.get(id).push(a);
            }
            const propertyIds = Array.from(new Set(leases.map((l) => String(l.property_id)).filter(Boolean)));
            const props = await db
                .collection('properties')
                .find({ propertyId: { $in: propertyIds } })
                .project({ propertyId: 1, property_name: 1 })
                .toArray();
            const nameById = new Map(props.map((p) => [String(p.propertyId), String(p.property_name ?? '')]));
            const now = Date.now();
            const horizon = now + withinDays * 24 * 60 * 60 * 1000;
            const rows = [];
            for (const l of leases) {
                let info = { ...(l.lease_information ?? {}) };
                for (const a of amendsByLease.get(String(l.leaseId)) ?? []) {
                    if (a.lease_information) {
                        info = (0, mongo_1.deepMerge)(info, a.lease_information);
                    }
                }
                const endStr = findEndDate(info);
                if (!endStr)
                    continue;
                const t = Date.parse(endStr);
                if (isNaN(t) || t < now || t > horizon)
                    continue;
                rows.push({
                    lease_id: String(l.leaseId),
                    property_id: String(l.property_id ?? ''),
                    property_name: nameById.get(String(l.property_id ?? '')),
                    file_name: String(l.file_name),
                    end_date: endStr,
                    days_to_expiry: Math.round((t - now) / (24 * 60 * 60 * 1000)),
                });
            }
            rows.sort((a, b) => a.days_to_expiry - b.days_to_expiry);
            return {
                success: true,
                leases: rows.slice(0, limit),
                total: rows.length,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch expiring leases: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-expiring-leases.js.map