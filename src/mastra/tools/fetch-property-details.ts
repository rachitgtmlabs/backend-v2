import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';
import { assertPortfolioAccess, noAccess, getOrgId } from '../lib/rbac';

export const fetchPropertyDetailsTool = createTool({
  id: 'fetch-property-details',
  description: `Returns details for a single property: metadata, the latest lease summary (lease id, status, file name, version), count of amendments, and counts of open tasks/alerts. Use when the user asks "tell me about <property>" or wants a property snapshot before drilling into a lease.`,
  inputSchema: z.object({
    portfolio_id: z.string().describe('Portfolio id'),
    property_id: z.string().describe('Property id (prp_*)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    property: z
      .object({
        id: z.string(),
        name: z.string(),
        address: z.string().optional(),
        property_type: z.string().optional(),
        portfolio_id: z.string(),
      })
      .optional(),
    latestLease: z
      .object({
        lease_id: z.string(),
        status: z.string(),
        file_name: z.string(),
        amendment_version: z.number(),
        amendments_count: z.number(),
        updated_at: z.string(),
      })
      .nullable()
      .optional(),
    openTasks: z.number().optional(),
    openAlerts: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id, property_id } = inputData;
    try {
      const orgId = getOrgId(context);
      if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
        return noAccess('property');
      }
      const db = await getDb();

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
        const lease_id = latestLease.leaseId as string;
        const [aCount, taskCount, alertCountNew, alertCountLegacy] =
          await Promise.all([
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
              updated_at:
                latestLease.updatedAt instanceof Date
                  ? latestLease.updatedAt.toISOString()
                  : String(latestLease.updatedAt ?? ''),
            }
          : null,
        openTasks,
        openAlerts,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch property details: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
