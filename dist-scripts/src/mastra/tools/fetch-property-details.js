"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPropertyDetailsTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const rbac_1 = require("../lib/rbac");
exports.fetchPropertyDetailsTool = (0, tools_1.createTool)({
    id: 'fetch-property-details',
    description: `Returns details for a single property: metadata, the latest lease summary (lease id, status, file name, version), count of amendments, and counts of open tasks/alerts. Use when the user asks "tell me about <property>" or wants a property snapshot before drilling into a lease.`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z.string().describe('Portfolio id'),
        property_id: zod_1.z.string().describe('Property id (prp_*)'),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        property: zod_1.z
            .object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            address: zod_1.z.string().optional(),
            property_type: zod_1.z.string().optional(),
            portfolio_id: zod_1.z.string(),
        })
            .optional(),
        latestLease: zod_1.z
            .object({
            lease_id: zod_1.z.string(),
            status: zod_1.z.string(),
            file_name: zod_1.z.string(),
            amendment_version: zod_1.z.number(),
            amendments_count: zod_1.z.number(),
            updated_at: zod_1.z.string(),
        })
            .nullable()
            .optional(),
        openTasks: zod_1.z.number().optional(),
        openAlerts: zod_1.z.number().optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const { portfolio_id, property_id } = inputData;
        try {
            const orgId = (0, rbac_1.getOrgId)(context);
            if (!(await (0, rbac_1.assertPortfolioAccess)(portfolio_id, orgId))) {
                return (0, rbac_1.noAccess)('property');
            }
            const db = await (0, mongo_1.getDb)();
            const [property, latestLease] = await Promise.all([
                db
                    .collection('properties')
                    .findOne({ propertyId: property_id, portfolio_id }),
                db
                    .collection('leases')
                    .find({ portfolio_id, property_id })
                    .sort({ updatedAt: -1 })
                    .limit(1)
                    .next(),
            ]);
            if (!property) {
                return {
                    success: false,
                    error: `Property ${property_id} not found in portfolio ${portfolio_id}.`,
                };
            }
            let amendmentsCount = 0;
            let openTasks = 0;
            let openAlerts = 0;
            if (latestLease) {
                const lease_id = latestLease.leaseId;
                const [aCount, taskCount, alertCountNew, alertCountLegacy] = await Promise.all([
                    db.collection('amendments').countDocuments({ lease_id }),
                    db.collection('property_task_alerts').countDocuments({
                        portfolio_id,
                        property_id,
                        lease_id,
                        category: 'task',
                        is_resolved: false,
                    }),
                    db.collection('property_alerts').countDocuments({
                        portfolio_id,
                        property_id,
                        lease_id,
                        is_resolved: false,
                    }),
                    db.collection('property_task_alerts').countDocuments({
                        portfolio_id,
                        property_id,
                        lease_id,
                        category: 'alert',
                        is_resolved: false,
                    }),
                ]);
                amendmentsCount = aCount;
                openTasks = taskCount;
                openAlerts = alertCountNew + alertCountLegacy;
            }
            return {
                success: true,
                property: {
                    id: String(property.propertyId),
                    name: String(property.property_name ?? ''),
                    address: property.address
                        ? String(property.address)
                        : undefined,
                    property_type: property.property_type
                        ? String(property.property_type)
                        : undefined,
                    portfolio_id: String(property.portfolio_id),
                },
                latestLease: latestLease
                    ? {
                        lease_id: String(latestLease.leaseId),
                        status: String(latestLease.status),
                        file_name: String(latestLease.file_name),
                        amendment_version: Number(latestLease.amendment_version ?? 0),
                        amendments_count: amendmentsCount,
                        updated_at: latestLease.updatedAt instanceof Date
                            ? latestLease.updatedAt.toISOString()
                            : String(latestLease.updatedAt ?? ''),
                    }
                    : null,
                openTasks,
                openAlerts,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch property details: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-property-details.js.map