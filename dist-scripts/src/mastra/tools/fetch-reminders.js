"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRemindersTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
exports.fetchRemindersTool = (0, tools_1.createTool)({
    id: 'fetch-reminders',
    description: `Returns upcoming deadline reminders: drafted-amendment reminders with reminderIso dates AND property alerts with a due_timeline. Sorted by date. Use when the user asks "what deadlines are coming up?", "what's due this week?", or wants reminders.`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string().optional(),
        property_id: zod_1.z.string().optional(),
        withinDays: zod_1.z.number().int().min(1).max(365).default(60),
        limit: zod_1.z.number().int().min(1).max(100).default(50),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        reminders: zod_1.z
            .array(zod_1.z.object({
            source: zod_1.z.enum(['drafted_amendment', 'property_alert']),
            property_id: zod_1.z.string(),
            property_name: zod_1.z.string().optional(),
            lease_id: zod_1.z.string(),
            title: zod_1.z.string(),
            due: zod_1.z.string(),
            severity: zod_1.z.string().optional(),
            days_until: zod_1.z.number().nullable(),
        }))
            .optional(),
        total: zod_1.z.number().optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData) => {
        const { portfolio_id, property_id, withinDays, limit } = inputData;
        try {
            const db = await (0, mongo_1.getDb)();
            const leaseFilter = {};
            const alertFilter = { is_resolved: false };
            if (portfolio_id) {
                leaseFilter.portfolio_id = portfolio_id;
                alertFilter.portfolio_id = portfolio_id;
            }
            if (property_id) {
                leaseFilter.property_id = property_id;
                alertFilter.property_id = property_id;
            }
            const [leases, alerts] = await Promise.all([
                db.collection('leases').find(leaseFilter).toArray(),
                db.collection('property_alerts').find(alertFilter).toArray(),
            ]);
            const propertyIds = Array.from(new Set([
                ...leases.map((l) => String(l.property_id ?? '')),
                ...alerts.map((a) => String(a.property_id ?? '')),
            ]));
            const props = await db
                .collection('properties')
                .find({ propertyId: { $in: propertyIds } })
                .project({ propertyId: 1, property_name: 1 })
                .toArray();
            const nameById = new Map(props.map((p) => [String(p.propertyId), String(p.property_name ?? '')]));
            const now = Date.now();
            const horizon = now + withinDays * 24 * 60 * 60 * 1000;
            const reminders = [];
            for (const l of leases) {
                const drafts = (l.drafted_amendments ?? []);
                for (const d of drafts) {
                    const iso = d.reminderIso;
                    if (typeof iso !== 'string' || !iso)
                        continue;
                    const t = Date.parse(iso);
                    if (isNaN(t) || t > horizon)
                        continue;
                    reminders.push({
                        source: 'drafted_amendment',
                        property_id: String(l.property_id ?? ''),
                        property_name: nameById.get(String(l.property_id ?? '')),
                        lease_id: String(l.leaseId),
                        title: String(d.riskTitle ?? d.resolutionLabel ?? 'Amendment reminder'),
                        due: iso,
                        severity: d.riskSeverity ? String(d.riskSeverity) : undefined,
                        days_until: Math.round((t - now) / (24 * 60 * 60 * 1000)),
                    });
                }
            }
            for (const a of alerts) {
                const due = a.due_timeline;
                if (typeof due !== 'string' || !due)
                    continue;
                const t = Date.parse(due);
                const days = !isNaN(t)
                    ? Math.round((t - now) / (24 * 60 * 60 * 1000))
                    : null;
                if (days !== null && (days < -1 || t > horizon))
                    continue;
                reminders.push({
                    source: 'property_alert',
                    property_id: String(a.property_id),
                    property_name: nameById.get(String(a.property_id)),
                    lease_id: String(a.lease_id),
                    title: String(a.title),
                    due,
                    severity: String(a.severity ?? '').toLowerCase(),
                    days_until: days,
                });
            }
            reminders.sort((a, b) => {
                const aD = a.days_until ?? 1e9;
                const bD = b.days_until ?? 1e9;
                return aD - bD;
            });
            return {
                success: true,
                reminders: reminders.slice(0, limit),
                total: reminders.length,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch reminders: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-reminders.js.map