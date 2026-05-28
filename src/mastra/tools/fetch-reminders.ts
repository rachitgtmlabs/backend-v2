import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';

export const fetchRemindersTool = createTool({
  id: 'fetch-reminders',
  description: `Returns upcoming deadline reminders: drafted-amendment reminders with reminderIso dates AND property alerts with a due_timeline. Sorted by date. Use when the user asks "what deadlines are coming up?", "what's due this week?", or wants reminders.`,
  inputSchema: z.object({
    portfolio_id: z.string().optional(),
    property_id: z.string().optional(),
    withinDays: z.number().int().min(1).max(365).default(60),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    reminders: z
      .array(
        z.object({
          source: z.enum(['drafted_amendment', 'property_alert']),
          property_id: z.string(),
          property_name: z.string().optional(),
          lease_id: z.string(),
          title: z.string(),
          due: z.string(),
          severity: z.string().optional(),
          days_until: z.number().nullable(),
        }),
      )
      .optional(),
    total: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData) => {
    const { portfolio_id, property_id, withinDays, limit } = inputData;
    try {
      const db = await getDb();
      const leaseFilter: Record<string, unknown> = {};
      const alertFilter: Record<string, unknown> = { is_resolved: false };
      if (portfolio_id) {
        leaseFilter.portfolio_id = portfolio_id;
        alertFilter.portfolio_id = portfolio_id;
      }
      if (property_id) {
        leaseFilter.property_id = property_id;
        alertFilter.property_id = property_id;
      }

      const [leases, alerts] = await Promise.all([
        db.collection('leases').find(leaseFilter).toArray(),
        db.collection('property_alerts').find(alertFilter).toArray(),
      ]);

      const propertyIds = Array.from(
        new Set([
          ...leases.map((l) => String(l.property_id ?? '')),
          ...alerts.map((a) => String(a.property_id ?? '')),
        ]),
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
      const reminders: Array<{
        source: 'drafted_amendment' | 'property_alert';
        property_id: string;
        property_name?: string;
        lease_id: string;
        title: string;
        due: string;
        severity?: string;
        days_until: number | null;
      }> = [];

      for (const l of leases) {
        const drafts = (l.drafted_amendments ?? []) as Array<
          Record<string, unknown>
        >;
        for (const d of drafts) {
          const iso = d.reminderIso;
          if (typeof iso !== 'string' || !iso) continue;
          const t = Date.parse(iso);
          if (isNaN(t) || t > horizon) continue;
          reminders.push({
            source: 'drafted_amendment',
            property_id: String(l.property_id ?? ''),
            property_name: nameById.get(String(l.property_id ?? '')),
            lease_id: String(l.leaseId),
            title: String(d.riskTitle ?? d.resolutionLabel ?? 'Amendment reminder'),
            due: iso,
            severity: d.riskSeverity ? String(d.riskSeverity) : undefined,
            days_until: Math.round((t - now) / (24 * 60 * 60 * 1000)),
          });
        }
      }

      for (const a of alerts) {
        const due = a.due_timeline;
        if (typeof due !== 'string' || !due) continue;
        const t = Date.parse(due);
        const days = !isNaN(t)
          ? Math.round((t - now) / (24 * 60 * 60 * 1000))
          : null;
        if (days !== null && (days < -1 || t > horizon)) continue;
        reminders.push({
          source: 'property_alert',
          property_id: String(a.property_id),
          property_name: nameById.get(String(a.property_id)),
          lease_id: String(a.lease_id),
          title: String(a.title),
          due,
          severity: String(a.severity ?? '').toLowerCase(),
          days_until: days,
        });
      }

      reminders.sort((a, b) => {
        const aD = a.days_until ?? 1e9;
        const bD = b.days_until ?? 1e9;
        return aD - bD;
      });

      return {
        success: true,
        reminders: reminders.slice(0, limit),
        total: reminders.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch reminders: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
