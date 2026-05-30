"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPropertiesTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const rbac_1 = require("../lib/rbac");
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
exports.searchPropertiesTool = (0, tools_1.createTool)({
    id: 'search-properties',
    description: `Search for properties by name OR address (case-insensitive substring match), and/or list all properties in a specific portfolio.
The property_name argument matches against BOTH the property_name field and the address field, so street/city names work too.
If several properties match, show a numbered list and ask which one they mean before fetch-lease-document.
Use this tool when:
- The user mentions a property name, street, or city and you need to find its ID
- You need to list all properties in a specific portfolio
- You need to find which portfolio a property belongs to

Pass portfolio_id ONLY when the user explicitly scoped the question to a portfolio (e.g. "in Silverline"). When the user just names a property, omit portfolio_id so the search covers all portfolios.`,
    inputSchema: zod_1.z.object({
        property_name: zod_1.z
            .string()
            .optional()
            .describe('Property name to search for (partial match, case-insensitive)'),
        portfolio_id: zod_1.z
            .string()
            .optional()
            .describe('Portfolio ID to filter properties (e.g., pf_abc123)'),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        properties: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            portfolio_id: zod_1.z.string(),
            address: zod_1.z.string().optional(),
            property_type: zod_1.z.string().optional(),
            has_lease: zod_1.z.boolean(),
            lease_id: zod_1.z.string().optional(),
        }))
            .optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const { property_name, portfolio_id } = inputData;
        try {
            const orgId = (0, rbac_1.getOrgId)(context);
            let allowedPortfolioIds;
            if (portfolio_id) {
                const ok = await (0, rbac_1.assertPortfolioAccess)(portfolio_id, orgId);
                if (!ok)
                    return (0, rbac_1.noAccess)('property');
                allowedPortfolioIds = [portfolio_id];
            }
            else {
                allowedPortfolioIds = await (0, rbac_1.getAccessiblePortfolioIds)(orgId);
                if (allowedPortfolioIds.length === 0) {
                    return { success: true, properties: [] };
                }
            }
            const db = await (0, mongo_1.getDb)();
            const query = {
                portfolio_id: { $in: allowedPortfolioIds },
            };
            if (property_name) {
                const rx = { $regex: escapeRegex(property_name), $options: 'i' };
                query.$or = [{ property_name: rx }, { address: rx }];
            }
            const properties = await db
                .collection('properties')
                .find(query)
                .project({
                propertyId: 1,
                property_name: 1,
                portfolio_id: 1,
                address: 1,
                property_type: 1,
            })
                .limit(20)
                .toArray();
            const propertyIds = properties
                .map((p) => p.propertyId)
                .filter((id) => typeof id === 'string');
            const leaseRows = propertyIds.length
                ? await db
                    .collection('leases')
                    .find({ property_id: { $in: propertyIds }, status: 'processed' }, { projection: { leaseId: 1, property_id: 1 } })
                    .toArray()
                : [];
            const leaseByProperty = new Map();
            for (const row of leaseRows) {
                if (row.property_id && row.leaseId) {
                    if (!leaseByProperty.has(row.property_id)) {
                        leaseByProperty.set(row.property_id, row.leaseId);
                    }
                }
            }
            const propertiesWithLeaseInfo = properties.map((p) => {
                const leaseId = leaseByProperty.get(p.propertyId);
                return {
                    id: p.propertyId,
                    name: p.property_name,
                    portfolio_id: p.portfolio_id,
                    address: p.address,
                    property_type: p.property_type,
                    has_lease: !!leaseId,
                    lease_id: leaseId,
                };
            });
            return {
                success: true,
                properties: propertiesWithLeaseInfo,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to search properties: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=search-properties.js.map