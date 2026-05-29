"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTasksAlertsTool = void 0;
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
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];
function severityRank(severity) {
    const i = SEVERITY_ORDER.indexOf(severity);
    return i === -1 ? SEVERITY_ORDER.length : i;
}
function mapPropertyAlert(doc) {
    return {
        id: String(doc.itemId),
        title: String(doc.title),
        severity: String(doc.severity),
        is_resolved: doc.is_resolved === true,
        ...(doc.details != null && doc.details !== ''
            ? { details: String(doc.details) }
            : {}),
        ...(typeof doc.sortOrder === 'number' ? { sortOrder: doc.sortOrder } : {}),
        ...(doc.alert_type != null && String(doc.alert_type).trim() !== ''
            ? { alert_type: String(doc.alert_type).trim() }
            : {}),
        ...(doc.due_timeline != null && String(doc.due_timeline).trim() !== ''
            ? { due_timeline: String(doc.due_timeline).trim() }
            : {}),
        ...(doc.suggested_action != null &&
            String(doc.suggested_action).trim() !== ''
            ? { suggested_action: String(doc.suggested_action).trim() }
            : {}),
    };
}
function mapTaskAlert(doc) {
    return {
        id: String(doc.itemId),
        title: String(doc.title),
        severity: String(doc.severity),
        is_resolved: doc.is_resolved === true,
        ...(doc.details != null && doc.details !== ''
            ? { details: String(doc.details) }
            : {}),
        ...(typeof doc.sortOrder === 'number' ? { sortOrder: doc.sortOrder } : {}),
    };
}
function sortAlerts(rows) {
    return [...rows].sort((a, b) => {
        const ar = a.is_resolved ? 1 : 0;
        const br = b.is_resolved ? 1 : 0;
        if (ar !== br)
            return ar - br;
        const sr = severityRank(a.severity) - severityRank(b.severity);
        if (sr !== 0)
            return sr;
        return (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9);
    });
}
function sortTasks(rows) {
    return sortAlerts(rows);
}
exports.fetchTasksAlertsTool = (0, tools_1.createTool)({
    id: 'fetch-tasks-alerts',
    description: `Loads open tasks and alerts for a property/lease (same data as the Tasks and Alerts tab).
Use when the user asks what to focus on today, about their tasks, to-dos, alerts, priorities, or follow-ups tied to the lease.`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string().describe('Portfolio ID'),
        property_id: zod_1.z.string().describe('Property ID'),
        lease_id: zod_1.z
            .string()
            .optional()
            .describe('Lease ID (les_*). Omit to use the most recently updated lease for this property.'),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        lease_id: zod_1.z.string().optional(),
        tasks: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
        alerts: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData) => {
        const { portfolio_id, property_id, lease_id: leaseIdInput } = inputData;
        try {
            const conn = await getConnection();
            const db = conn.connection.db;
            if (!db) {
                return { success: false, error: 'Database connection not available' };
            }
            const leasesCollection = db.collection('leases');
            const propertyAlertsColl = db.collection('property_alerts');
            const taskAlertsColl = db.collection('property_task_alerts');
            let resolvedLeaseId;
            if (leaseIdInput) {
                const lease = await leasesCollection.findOne({
                    leaseId: leaseIdInput,
                    portfolio_id,
                    property_id,
                });
                if (!lease) {
                    return {
                        success: false,
                        error: `Lease ${leaseIdInput} not found for this portfolio and property.`,
                    };
                }
                resolvedLeaseId = lease.leaseId;
            }
            else {
                const lease = await leasesCollection
                    .find({ portfolio_id, property_id })
                    .sort({ updatedAt: -1 })
                    .limit(1)
                    .next();
                if (!lease) {
                    return {
                        success: false,
                        error: 'No saved lease for this property.',
                    };
                }
                resolvedLeaseId = lease.leaseId;
            }
            const [alertsNew, alertsLegacy, taskDocs] = await Promise.all([
                propertyAlertsColl
                    .find({
                    portfolio_id,
                    property_id,
                    lease_id: resolvedLeaseId,
                })
                    .toArray(),
                taskAlertsColl
                    .find({
                    portfolio_id,
                    property_id,
                    lease_id: resolvedLeaseId,
                    category: 'alert',
                })
                    .toArray(),
                taskAlertsColl
                    .find({
                    portfolio_id,
                    property_id,
                    lease_id: resolvedLeaseId,
                    category: 'task',
                })
                    .toArray(),
            ]);
            const alerts = [
                ...alertsNew.map((d) => mapPropertyAlert(d)),
                ...alertsLegacy.map((d) => mapTaskAlert(d)),
            ];
            const tasks = taskDocs.map((d) => mapTaskAlert(d));
            return {
                success: true,
                lease_id: resolvedLeaseId,
                alerts: sortAlerts(alerts),
                tasks: sortTasks(tasks),
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to load tasks/alerts: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-tasks-alerts.js.map