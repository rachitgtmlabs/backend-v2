import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';
import { assertPortfolioAccess, noAccess, getOrgId } from '../lib/rbac';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

function severityRank(severity: string): number {
  const i = SEVERITY_ORDER.indexOf(severity as (typeof SEVERITY_ORDER)[number]);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

type Row = {
  id: string;
  title: string;
  severity: string;
  is_resolved: boolean;
  details?: string;
  sortOrder?: number;
  alert_type?: string;
  due_timeline?: string;
  suggested_action?: string;
};

function mapPropertyAlert(doc: Record<string, unknown>): Row {
  return {
    id: String(doc.itemId),
    title: String(doc.title),
    severity: String(doc.severity),
    is_resolved: doc.is_resolved === true,
    ...(doc.details != null && doc.details !== ''
      ? { details: String(doc.details) }
      : {}),
    ...(typeof doc.sortOrder === 'number' ? { sortOrder: doc.sortOrder } : {}),
    ...(doc.alert_type != null && String(doc.alert_type).trim() !== ''
      ? { alert_type: String(doc.alert_type).trim() }
      : {}),
    ...(doc.due_timeline != null && String(doc.due_timeline).trim() !== ''
      ? { due_timeline: String(doc.due_timeline).trim() }
      : {}),
    ...(doc.suggested_action != null &&
    String(doc.suggested_action).trim() !== ''
      ? { suggested_action: String(doc.suggested_action).trim() }
      : {}),
  };
}

function mapTaskAlert(doc: Record<string, unknown>): Row {
  return {
    id: String(doc.itemId),
    title: String(doc.title),
    severity: String(doc.severity),
    is_resolved: doc.is_resolved === true,
    ...(doc.details != null && doc.details !== ''
      ? { details: String(doc.details) }
      : {}),
    ...(typeof doc.sortOrder === 'number' ? { sortOrder: doc.sortOrder } : {}),
  };
}

function sortAlerts(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const ar = a.is_resolved ? 1 : 0;
    const br = b.is_resolved ? 1 : 0;
    if (ar !== br) return ar - br;
    const sr = severityRank(a.severity) - severityRank(b.severity);
    if (sr !== 0) return sr;
    return (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9);
  });
}

function sortTasks(rows: Row[]): Row[] {
  return sortAlerts(rows);
}

export const fetchTasksAlertsTool = createTool({
  id: 'fetch-tasks-alerts',
  description: `Loads open tasks and alerts for a property/lease (same data as the Tasks and Alerts tab).
Use when the user asks what to focus on today, about their tasks, to-dos, alerts, priorities, or follow-ups tied to the lease.`,
  inputSchema: z.object({
    portfolio_id: z.string().describe('Portfolio ID'),
    property_id: z.string().describe('Property ID'),
    lease_id: z
      .string()
      .optional()
      .describe(
        'Lease ID (les_*). Omit to use the most recently updated lease for this property.',
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    lease_id: z.string().optional(),
    tasks: z.array(z.record(z.unknown())).optional(),
    alerts: z.array(z.record(z.unknown())).optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id, property_id, lease_id: leaseIdInput } = inputData;

    try {
      const orgId = getOrgId(context);
      if (!(await assertPortfolioAccess(portfolio_id, orgId))) {
        return noAccess('tasks/alerts');
      }
      const db = await getDb();

      const leasesCollection = db.collection('leases');
      const propertyAlertsColl = db.collection('property_alerts');
      const taskAlertsColl = db.collection('property_task_alerts');

      let resolvedLeaseId: string;

      if (leaseIdInput) {
        const lease = await leasesCollection.findOne({
          leaseId: leaseIdInput,
          portfolio_id,
          property_id,
        });
        if (!lease) {
          return {
            success: false,
            error: `Lease ${leaseIdInput} not found for this portfolio and property.`,
          };
        }
        resolvedLeaseId = lease.leaseId as string;
      } else {
        const lease = await leasesCollection
          .find({ portfolio_id, property_id })
          .sort({ updatedAt: -1 })
          .limit(1)
          .next();
        if (!lease) {
          return {
            success: false,
            error: 'No saved lease for this property.',
          };
        }
        resolvedLeaseId = lease.leaseId as string;
      }

      const [alertsNew, alertsLegacy, taskDocs] = await Promise.all([
        propertyAlertsColl
          .find({
            portfolio_id,
            property_id,
            lease_id: resolvedLeaseId,
          })
          .toArray(),
        taskAlertsColl
          .find({
            portfolio_id,
            property_id,
            lease_id: resolvedLeaseId,
            category: 'alert',
          })
          .toArray(),
        taskAlertsColl
          .find({
            portfolio_id,
            property_id,
            lease_id: resolvedLeaseId,
            category: 'task',
          })
          .toArray(),
      ]);

      const alerts: Row[] = [
        ...alertsNew.map((d) =>
          mapPropertyAlert(d as Record<string, unknown>),
        ),
        ...alertsLegacy.map((d) => mapTaskAlert(d as Record<string, unknown>)),
      ];
      const tasks: Row[] = taskDocs.map((d) =>
        mapTaskAlert(d as Record<string, unknown>),
      );

      return {
        success: true,
        lease_id: resolvedLeaseId,
        alerts: sortAlerts(alerts) as unknown as Record<string, unknown>[],
        tasks: sortTasks(tasks) as unknown as Record<string, unknown>[],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load tasks/alerts: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
