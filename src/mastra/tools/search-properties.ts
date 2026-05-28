import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import mongoose from 'mongoose';

const connectionString =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/lease_iq';

let cachedConnection: typeof mongoose | null = null;

async function getConnection() {
  if (cachedConnection?.connection?.readyState === 1) {
    return cachedConnection;
  }

  cachedConnection = await mongoose.connect(connectionString);
  return cachedConnection;
}

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
  execute: async (inputData) => {
    const { property_name, portfolio_id } = inputData;

    try {
      const conn = await getConnection();
      const db = conn.connection.db;

      if (!db) {
        return { success: false, error: 'Database connection not available' };
      }

      const propertiesCollection = db.collection('properties');
      const leasesCollection = db.collection('leases');

      const query: Record<string, unknown> = {};

      if (portfolio_id) {
        query.portfolio_id = portfolio_id;
      }

      if (property_name) {
        const rx = { $regex: escapeRegex(property_name), $options: 'i' };
        // Match on property_name OR address — users often refer to a property
        // by its street or city, not the saved name.
        query.$or = [{ property_name: rx }, { address: rx }];
      }

      const properties = await propertiesCollection
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
        ? await leasesCollection
            .find(
              { property_id: { $in: propertyIds }, status: 'processed' },
              { projection: { leaseId: 1, property_id: 1 } },
            )
            .toArray()
        : [];

      const leaseByProperty = new Map<string, string>();
      for (const row of leaseRows) {
        if (row.property_id && row.leaseId) {
          // Prefer the first match (queries above are already filtered to processed).
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
