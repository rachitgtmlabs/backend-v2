import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';
import {
  assertPortfolioAccess,
  getAccessiblePortfolioIds,
  noAccess,
  getOrgId,
} from '../lib/rbac';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const searchPropertiesTool = createTool({
  id: 'search-properties',
  description: `Search for properties by name OR address (case-insensitive substring match), and/or list all properties in a specific portfolio.
The property_name argument matches against BOTH the property_name field and the address field, so street/city names work too.
If several properties match, show a numbered list and ask which one they mean before fetch-lease-document.
Use this tool when:
- The user mentions a property name, street, or city and you need to find its ID
- You need to list all properties in a specific portfolio
- You need to find which portfolio a property belongs to

Pass portfolio_id ONLY when the user explicitly scoped the question to a portfolio (e.g. "in Silverline"). When the user just names a property, omit portfolio_id so the search covers all portfolios.`,
  inputSchema: z.object({
    property_name: z
      .string()
      .optional()
      .describe('Property name to search for (partial match, case-insensitive)'),
    portfolio_id: z
      .string()
      .optional()
      .describe('Portfolio ID to filter properties (e.g., pf_abc123)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    properties: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          portfolio_id: z.string(),
          address: z.string().optional(),
          property_type: z.string().optional(),
          has_lease: z.boolean(),
          lease_id: z.string().optional(),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { property_name, portfolio_id } = inputData;

    try {
      const orgId = getOrgId(context);
      // RBAC: cap the search to portfolios in the caller's org.
      // If a portfolio_id was supplied, verify it belongs to the org first;
      // otherwise constrain to the full accessible-set via $in.
      let allowedPortfolioIds: string[];
      if (portfolio_id) {
        const ok = await assertPortfolioAccess(portfolio_id, orgId);
        if (!ok) return noAccess('property');
        allowedPortfolioIds = [portfolio_id];
      } else {
        allowedPortfolioIds = await getAccessiblePortfolioIds(orgId);
        if (allowedPortfolioIds.length === 0) {
          return { success: true, properties: [] };
        }
      }

      const db = await getDb();

      const query: Record<string, unknown> = {
        portfolio_id: { $in: allowedPortfolioIds },
      };

      if (property_name) {
        const rx = { $regex: escapeRegex(property_name), $options: 'i' };
        // Match on property_name OR address — users often refer to a property
        // by its street or city, not the saved name.
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

      // Batch lease lookups in a single query instead of N+1.
      const propertyIds = properties
        .map((p) => p.propertyId)
        .filter((id): id is string => typeof id === 'string');

      const leaseRows = propertyIds.length
        ? await db
            .collection('leases')
            .find(
              { property_id: { $in: propertyIds }, status: 'processed' },
              { projection: { leaseId: 1, property_id: 1 } },
            )
            .toArray()
        : [];

      const leaseByProperty = new Map<string, string>();
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
    } catch (error) {
      return {
        success: false,
        error: `Failed to search properties: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
