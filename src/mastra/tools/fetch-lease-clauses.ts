import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb, deepMerge } from '../lib/mongo';

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

export const fetchLeaseClausesTool = createTool({
  id: 'fetch-lease-clauses',
  description: `Searches a clause keyword across leases in a portfolio (or one property) and returns matching field/value pairs from the effective lease state. Use when the user asks portfolio-wide questions like "which leases have a termination option?", "what are all the rent escalations?", "show me CAM caps across the portfolio".`,
  inputSchema: z.object({
    portfolio_id: z.string().optional(),
    property_id: z.string().optional(),
    keyword: z
      .string()
      .min(2)
      .describe(
        'Clause keyword to search for in lease field names (e.g. "termination", "renewal", "rent", "cam", "escalation").',
      ),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    matches: z
      .array(
        z.object({
          lease_id: z.string(),
          property_id: z.string(),
          property_name: z.string().optional(),
          field: z.string(),
          value: z.unknown(),
        }),
      )
      .optional(),
    total: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData) => {
    const { portfolio_id, property_id, keyword, limit } = inputData;
    try {
      const db = await getDb();
      const filter: Record<string, unknown> = { status: 'processed' };
      if (portfolio_id) filter.portfolio_id = portfolio_id;
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

      const kw = keyword.toLowerCase();
      const matches: Array<{
        lease_id: string;
        property_id: string;
        property_name?: string;
        field: string;
        value: unknown;
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
        const flat = flatten(info);
        for (const [k, v] of Object.entries(flat)) {
          if (k.toLowerCase().includes(kw)) {
            matches.push({
              lease_id: String(l.leaseId),
              property_id: String(l.property_id ?? ''),
              property_name: nameById.get(String(l.property_id ?? '')),
              field: k,
              value: v,
            });
            if (matches.length >= limit) break;
          }
        }
        if (matches.length >= limit) break;
      }

      return { success: true, matches, total: matches.length };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search lease clauses: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
