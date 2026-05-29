import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';
import { assertPortfolioAccess, noAccess, getOrgId } from '../lib/rbac';

/** Walk amendments in order and emit field-level change events. */
function flatten(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.getPrototypeOf(v) === Object.prototype
    ) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

export const fetchAmendmentHistoryTool = createTool({
  id: 'fetch-amendment-history',
  description: `Returns a flat, field-level change log across all amendments for a lease. Use when the user asks "when did X change?" — e.g. "when was the rent last changed?", "has the security deposit ever been amended?".`,
  inputSchema: z.object({
    lease_id: z.string().describe('Lease id (les_*)'),
    fieldFilter: z
      .string()
      .optional()
      .describe(
        'Optional substring to filter field paths (case-insensitive), e.g. "rent", "cam", "expiration".',
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    changes: z
      .array(
        z.object({
          field: z.string(),
          fromVersion: z.number(),
          fromValue: z.unknown(),
          toVersion: z.number(),
          toValue: z.unknown(),
          updated_at: z.string(),
          amendmentId: z.string(),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { lease_id, fieldFilter } = inputData;
    try {
      const orgId = getOrgId(context);
      const db = await getDb();
      const lease = await db.collection('leases').findOne({ leaseId: lease_id });
      if (!lease) {
        return { success: false, error: `Lease not found: ${lease_id}` };
      }
      if (!(await assertPortfolioAccess(String(lease.portfolio_id), orgId))) {
        return noAccess('lease');
      }
      const amendments = await db
        .collection('amendments')
        .find({ lease_id })
        .sort({ version: 1 })
        .toArray();

      let current = flatten(
        (lease.lease_information ?? {}) as Record<string, unknown>,
      );
      const changes: Array<{
        field: string;
        fromVersion: number;
        fromValue: unknown;
        toVersion: number;
        toValue: unknown;
        updated_at: string;
        amendmentId: string;
      }> = [];

      let prevVersion = 0;
      for (const a of amendments) {
        const v = Number(a.version);
        const delta = flatten(
          (a.lease_information ?? {}) as Record<string, unknown>,
        );
        for (const [k, v2] of Object.entries(delta)) {
          const fromValue = current[k];
          if (JSON.stringify(fromValue) === JSON.stringify(v2)) continue;
          changes.push({
            field: k,
            fromVersion: prevVersion,
            fromValue,
            toVersion: v,
            toValue: v2,
            updated_at:
              a.updatedAt instanceof Date
                ? a.updatedAt.toISOString()
                : String(a.updatedAt ?? ''),
            amendmentId: String(a.amendmentId),
          });
          current[k] = v2;
        }
        prevVersion = v;
      }

      const filtered = fieldFilter
        ? changes.filter((c) =>
            c.field.toLowerCase().includes(fieldFilter.toLowerCase()),
          )
        : changes;

      return { success: true, changes: filtered };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch amendment history: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
