import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb, deepMerge } from '../lib/mongo';
import {
  assertPortfolioAccess,
  getAccessiblePortfolioIds,
  noAccess,
  getOrgId,
} from '../lib/rbac';

const DATE_KEYS = [
  'lease_end_date',
  'expiration_date',
  'lease_expiration',
  'end_date',
  'term_end_date',
];

function findEndDate(info: Record<string, unknown>): string | null {
  for (const k of DATE_KEYS) {
    const v = info[k];
    if (typeof v === 'string' && v) {
      const t = Date.parse(v);
      if (!isNaN(t)) return v;
    }
  }
  return null;
}

export const fetchExpiringLeasesTool = createTool({
  id: 'fetch-expiring-leases',
  description: `Returns leases expiring within a window (default next 12 months), sorted by urgency. Looks at the effective lease state (lease + amendments merged). Use when the user asks "what leases expire soon", "what's coming up next year", or about renewal pressure.`,
  inputSchema: z.object({
    portfolio_id: z.string().optional(),
    property_id: z.string().optional(),
    withinDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .default(365)
      .describe('Window in days from today.'),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    leases: z
      .array(
        z.object({
          lease_id: z.string(),
          property_id: z.string(),
          property_name: z.string().optional(),
          file_name: z.string(),
          end_date: z.string(),
          days_to_expiry: z.number(),
        }),
      )
      .optional(),
    total: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id, property_id, withinDays, limit } = inputData;
    try {
      const orgId = getOrgId(context);
      let scopedPortfolioIds: string[];
      if (portfolio_id) {
        if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
          return noAccess('leases');
        }
        scopedPortfolioIds = [portfolio_id];
      } else {
        scopedPortfolioIds = await getAccessiblePortfolioIds(orgId);
        if (scopedPortfolioIds.length === 0) {
          return { success: true, leases: [], total: 0 };
        }
      }

      const db = await getDb();
      const filter: Record<string, unknown> = {
        status: 'processed',
        portfolio_id: { $in: scopedPortfolioIds },
      };
      if (property_id) filter.property_id = property_id;

      const leases = await db.collection('leases').find(filter).toArray();
      const leaseIds = leases.map((l) => String(l.leaseId));
      const amendments = leaseIds.length
        ? await db
            .collection('amendments')
            .find({ lease_id: { $in: leaseIds } })
            .sort({ version: 1 })
            .toArray()
        : [];

      const amendsByLease = new Map<string, Record<string, unknown>[]>();
      for (const a of amendments) {
        const id = String(a.lease_id);
        if (!amendsByLease.has(id)) amendsByLease.set(id, []);
        amendsByLease.get(id)!.push(a as unknown as Record<string, unknown>);
      }

      const propertyIds = Array.from(
        new Set(leases.map((l) => String(l.property_id)).filter(Boolean)),
      );
      const props = await db
        .collection('properties')
        .find({ propertyId: { $in: propertyIds } })
        .project({ propertyId: 1, property_name: 1 })
        .toArray();
      const nameById = new Map(
        props.map((p) => [String(p.propertyId), String(p.property_name ?? '')]),
      );

      const now = Date.now();
      const horizon = now + withinDays * 24 * 60 * 60 * 1000;
      const rows: Array<{
        lease_id: string;
        property_id: string;
        property_name?: string;
        file_name: string;
        end_date: string;
        days_to_expiry: number;
      }> = [];

      for (const l of leases) {
        let info = { ...((l.lease_information ?? {}) as Record<string, unknown>) };
        for (const a of amendsByLease.get(String(l.leaseId)) ?? []) {
          if (a.lease_information) {
            info = deepMerge(
              info,
              a.lease_information as Record<string, unknown>,
            );
          }
        }
        const endStr = findEndDate(info);
        if (!endStr) continue;
        const t = Date.parse(endStr);
        if (isNaN(t) || t < now || t > horizon) continue;
        rows.push({
          lease_id: String(l.leaseId),
          property_id: String(l.property_id ?? ''),
          property_name: nameById.get(String(l.property_id ?? '')),
          file_name: String(l.file_name),
          end_date: endStr,
          days_to_expiry: Math.round((t - now) / (24 * 60 * 60 * 1000)),
        });
      }

      rows.sort((a, b) => a.days_to_expiry - b.days_to_expiry);

      return {
        success: true,
        leases: rows.slice(0, limit),
        total: rows.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expiring leases: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
