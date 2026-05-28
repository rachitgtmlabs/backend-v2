import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';

export const fetchLeaseEvolutionTool = createTool({
  id: 'fetch-lease-evolution',
  description: `Returns the timeline of how a lease evolved: original lease plus each amendment, with the list of changed sections in each amendment and the date. Use when the user asks how a lease changed over time, what amendments did, or wants a chronological view of a lease.`,
  inputSchema: z.object({
    lease_id: z.string().describe('Lease id (les_*)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    lease: z
      .object({
        lease_id: z.string(),
        file_name: z.string(),
        status: z.string(),
        created_at: z.string(),
        initialSections: z.array(z.string()),
      })
      .optional(),
    timeline: z
      .array(
        z.object({
          version: z.number(),
          amendmentId: z.string(),
          file_name: z.string(),
          status: z.string(),
          changedSections: z.array(z.string()),
          changedFields: z.array(z.string()),
          updated_at: z.string(),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData) => {
    const { lease_id } = inputData;
    try {
      const db = await getDb();
      const lease = await db.collection('leases').findOne({ leaseId: lease_id });
      if (!lease) {
        return { success: false, error: `Lease not found: ${lease_id}` };
      }
      const amendments = await db
        .collection('amendments')
        .find({ lease_id })
        .sort({ version: 1 })
        .toArray();

      const initialSections = Object.keys(
        (lease.analysis ?? {}) as Record<string, unknown>,
      );

      const timeline = amendments.map((a) => ({
        version: Number(a.version),
        amendmentId: String(a.amendmentId),
        file_name: String(a.file_name),
        status: String(a.status),
        changedSections: Object.keys(
          (a.analysis ?? {}) as Record<string, unknown>,
        ),
        changedFields: Object.keys(
          (a.lease_information ?? {}) as Record<string, unknown>,
        ),
        updated_at:
          a.updatedAt instanceof Date
            ? a.updatedAt.toISOString()
            : String(a.updatedAt ?? ''),
      }));

      return {
        success: true,
        lease: {
          lease_id: String(lease.leaseId),
          file_name: String(lease.file_name),
          status: String(lease.status),
          created_at:
            lease.createdAt instanceof Date
              ? lease.createdAt.toISOString()
              : String(lease.createdAt ?? ''),
          initialSections,
        },
        timeline,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch lease evolution: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
