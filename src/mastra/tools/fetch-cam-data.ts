import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb, deepMerge } from '../lib/mongo';
import { assertPortfolioAccess, noAccess, getOrgId } from '../lib/rbac';

/**
 * CAM-related fields the analyzer commonly stores in lease_information.
 * We surface whatever exists — clause text, caps, base year, recovery flags.
 */
const CAM_KEYS_REGEX = /cam|common[_ ]area|operating[_ ]expense|opex/i;

function pickCamFields(
  info: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(info)) {
    if (CAM_KEYS_REGEX.test(k)) out[k] = v;
  }
  return out;
}

export const fetchCamDataTool = createTool({
  id: 'fetch-cam-data',
  description: `Returns CAM (Common Area Maintenance) clause data extracted from a lease (caps, base year, recovery terms) plus any open CAM-tagged alerts. NOTE: actual billed-vs-entitled reconciliation (the "$92K under-billed" number) requires a billing/payments collection that does not yet exist — that field is returned as unavailable.`,
  inputSchema: z.object({
    portfolio_id: z.string(),
    property_id: z.string(),
    lease_id: z
      .string()
      .optional()
      .describe('Lease id; omit to use the latest lease for this property.'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    lease_id: z.string().optional(),
    camClauses: z.record(z.unknown()).optional(),
    camAlerts: z
      .array(
        z.object({
          itemId: z.string(),
          title: z.string(),
          severity: z.string(),
          details: z.string().optional(),
          alert_type: z.string().optional(),
        }),
      )
      .optional(),
    recoveryReconciliation: z
      .object({
        available: z.boolean(),
        note: z.string(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id, property_id, lease_id: leaseIdInput } = inputData;
    try {
      const orgId = getOrgId(context);
      if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
        return noAccess('CAM data');
      }
      const db = await getDb();
      let lease;
      if (leaseIdInput) {
        lease = await db
          .collection('leases')
          .findOne({ leaseId: leaseIdInput, portfolio_id, property_id });
      } else {
        lease = await db
          .collection('leases')
          .find({ portfolio_id, property_id })
          .sort({ updatedAt: -1 })
          .limit(1)
          .next();
      }
      if (!lease) {
        return {
          success: false,
          error: 'No lease found for this property.',
        };
      }
      const lease_id = String(lease.leaseId);

      const [amendments, alertsNew, alertsLegacy] = await Promise.all([
        db
          .collection('amendments')
          .find({ lease_id })
          .sort({ version: 1 })
          .toArray(),
        db
          .collection('property_alerts')
          .find({ portfolio_id, property_id, lease_id })
          .toArray(),
        db
          .collection('property_task_alerts')
          .find({
            portfolio_id,
            property_id,
            lease_id,
            category: 'alert',
          })
          .toArray(),
      ]);

      let info = { ...((lease.lease_information ?? {}) as Record<string, unknown>) };
      for (const a of amendments) {
        if (a.lease_information) {
          info = deepMerge(
            info,
            a.lease_information as Record<string, unknown>,
          );
        }
      }
      const camClauses = pickCamFields(info);

      const camAlerts = [...alertsNew, ...alertsLegacy]
        .filter((a) => {
          const t = String(a.alert_type ?? '').toLowerCase();
          const title = String(a.title ?? '').toLowerCase();
          return (
            t.includes('cam') ||
            t.includes('operating') ||
            title.includes('cam')
          );
        })
        .map((a) => ({
          itemId: String(a.itemId),
          title: String(a.title),
          severity: String(a.severity).toLowerCase(),
          details: a.details ? String(a.details) : undefined,
          alert_type: a.alert_type ? String(a.alert_type) : undefined,
        }));

      return {
        success: true,
        lease_id,
        camClauses,
        camAlerts,
        recoveryReconciliation: {
          available: false,
          note: 'Billed-vs-entitled CAM reconciliation requires a billing/payments collection that is not yet available. This will be supported soon.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch CAM data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
