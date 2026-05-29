"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLeaseDocumentTool = void 0;
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
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (sourceValue === undefined || sourceValue === null)
            continue;
        if (isPlainObject(sourceValue) &&
            isPlainObject(targetValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        }
        else {
            result[key] = sourceValue;
        }
    }
    return result;
}
function isPlainObject(value) {
    return (value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
exports.fetchLeaseDocumentTool = (0, tools_1.createTool)({
    id: 'fetch-lease-document',
    description: `Fetches the complete lease document and all amendments for a given lease. 
Use this tool to retrieve lease information when answering questions about lease terms, 
dates, financial details, clauses, or any other lease-related data. 
The tool returns the effective (merged) state of the lease including all amendments applied.`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string().describe('The portfolio ID (e.g., pf_abc123)'),
        property_id: zod_1.z.string().describe('The property ID (e.g., prp_xyz789)'),
        lease_id: zod_1.z.string().describe('The lease ID (e.g., les_def456)'),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        leaseId: zod_1.z.string().optional(),
        currentVersion: zod_1.z.number().optional(),
        effectiveLeaseInfo: zod_1.z.record(zod_1.z.unknown()).optional(),
        effectiveAnalysis: zod_1.z.record(zod_1.z.unknown()).optional(),
        lease: zod_1.z
            .object({
            id: zod_1.z.string(),
            portfolio_id: zod_1.z.string(),
            property_id: zod_1.z.string().nullable(),
            status: zod_1.z.string(),
            file_name: zod_1.z.string(),
            amendment_version: zod_1.z.number(),
            created_at: zod_1.z.string(),
            updated_at: zod_1.z.string(),
        })
            .optional(),
        amendments: zod_1.z
            .array(zod_1.z.object({
            version: zod_1.z.number(),
            amendmentId: zod_1.z.string(),
            file_name: zod_1.z.string(),
            status: zod_1.z.string(),
            changedSections: zod_1.z.array(zod_1.z.string()),
            updated_at: zod_1.z.string(),
        }))
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData) => {
        const { portfolio_id, property_id, lease_id } = inputData;
        try {
            const conn = await getConnection();
            const db = conn.connection.db;
            if (!db) {
                return { success: false, error: 'Database connection not available' };
            }
            const leasesCollection = db.collection('leases');
            const amendmentsCollection = db.collection('amendments');
            const lease = await leasesCollection.findOne({ leaseId: lease_id });
            if (!lease) {
                return { success: false, error: `Lease not found: ${lease_id}` };
            }
            if (lease.portfolio_id !== portfolio_id) {
                return {
                    success: false,
                    error: `Lease does not belong to portfolio ${portfolio_id}`,
                };
            }
            if (lease.property_id !== property_id) {
                return {
                    success: false,
                    error: `Lease does not belong to property ${property_id}`,
                };
            }
            const amendments = await amendmentsCollection
                .find({ lease_id: lease_id })
                .sort({ version: 1 })
                .toArray();
            let effectiveLeaseInfo = {
                ...(lease.lease_information || {}),
            };
            let effectiveAnalysis = { ...(lease.analysis || {}) };
            for (const amendment of amendments) {
                if (amendment.lease_information) {
                    effectiveLeaseInfo = deepMerge(effectiveLeaseInfo, amendment.lease_information);
                }
                if (amendment.analysis) {
                    effectiveAnalysis = deepMerge(effectiveAnalysis, amendment.analysis);
                }
            }
            const amendmentHistory = amendments.map((a) => ({
                version: a.version,
                amendmentId: a.amendmentId,
                file_name: a.file_name,
                status: a.status,
                changedSections: Object.keys(a.analysis || {}),
                updated_at: a.updatedAt?.toISOString() ?? new Date().toISOString(),
            }));
            return {
                success: true,
                leaseId: lease.leaseId,
                currentVersion: amendments.length,
                effectiveLeaseInfo,
                effectiveAnalysis,
                lease: {
                    id: lease.leaseId,
                    portfolio_id: lease.portfolio_id,
                    property_id: lease.property_id,
                    status: lease.status,
                    file_name: lease.file_name,
                    amendment_version: lease.amendment_version,
                    created_at: lease.createdAt?.toISOString() ?? new Date().toISOString(),
                    updated_at: lease.updatedAt?.toISOString() ?? new Date().toISOString(),
                },
                amendments: amendmentHistory,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch lease: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-lease-document.js.map