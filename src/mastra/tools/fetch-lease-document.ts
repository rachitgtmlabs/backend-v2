import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb, deepMerge } from '../lib/mongo';
import { assertPortfolioAccess, noAccess, getOrgId } from '../lib/rbac';

export const fetchLeaseDocumentTool = createTool({
  id: 'fetch-lease-document',
  description: `Fetches the complete lease document and all amendments for a given lease.
Use this tool to retrieve lease information when answering questions about lease terms,
dates, financial details, clauses, or any other lease-related data.
The tool returns the effective (merged) state of the lease including all amendments applied.`,
  inputSchema: z.object({
    portfolio_id: z.string().describe('The portfolio ID (e.g., pf_abc123)'),
    property_id: z.string().describe('The property ID (e.g., prp_xyz789)'),
    lease_id: z.string().describe('The lease ID (e.g., les_def456)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    leaseId: z.string().optional(),
    currentVersion: z.number().optional(),
    effectiveLeaseInfo: z.record(z.unknown()).optional(),
    effectiveAnalysis: z.record(z.unknown()).optional(),
    lease: z
      .object({
        id: z.string(),
        portfolio_id: z.string(),
        property_id: z.string().nullable(),
        status: z.string(),
        file_name: z.string(),
        amendment_version: z.number(),
        created_at: z.string(),
        updated_at: z.string(),
      })
      .optional(),
    amendments: z
      .array(
        z.object({
          version: z.number(),
          amendmentId: z.string(),
          file_name: z.string(),
          status: z.string(),
          changedSections: z.array(z.string()),
          updated_at: z.string(),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id, property_id, lease_id } = inputData;

    try {
      const orgId = getOrgId(context);
      if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
        return noAccess('lease');
      }
      const db = await getDb();

      const lease = await db.collection('leases').findOne({ leaseId: lease_id });

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

      const amendments = await db
        .collection('amendments')
        .find({ lease_id: lease_id })
        .sort({ version: 1 })
        .toArray();

      let effectiveLeaseInfo = {
        ...(lease.lease_information || {}),
      } as Record<string, unknown>;
      let effectiveAnalysis = { ...(lease.analysis || {}) } as Record<
        string,
        unknown
      >;

      for (const amendment of amendments) {
        if (amendment.lease_information) {
          effectiveLeaseInfo = deepMerge(
            effectiveLeaseInfo,
            amendment.lease_information as Record<string, unknown>,
          );
        }
        if (amendment.analysis) {
          effectiveAnalysis = deepMerge(
            effectiveAnalysis,
            amendment.analysis as Record<string, unknown>,
          );
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
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch lease: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
