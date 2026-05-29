import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb, severityRank } from '../lib/mongo';
import {
  assertPortfolioAccess,
  getAccessiblePortfolioIds,
  noAccess,
  orgPortfolioFilter,
  getOrgId,
} from '../lib/rbac';

export const fetchPortfolioOverviewTool = createTool({
  id: 'fetch-portfolio-overview',
  description: `Returns portfolio-level KPIs: total properties, total leases, processed lease count, open alert counts (by severity), and a count of leases expiring within the next 12 months. Use when the user asks how a portfolio is performing, KPIs, totals, or a high-level summary.`,
  inputSchema: z.object({
    portfolio_id: z
      .string()
      .optional()
      .describe(
        'Portfolio id. Omit to aggregate across ALL portfolios the user has.',
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    portfolio: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        property_type: z.string().optional(),
      })
      .optional(),
    totals: z
      .object({
        portfolios: z.number(),
        properties: z.number(),
        leases: z.number(),
        processedLeases: z.number(),
        amendments: z.number(),
      })
      .optional(),
    alertCounts: z
      .object({
        critical: z.number(),
        high: z.number(),
        medium: z.number(),
        low: z.number(),
        total: z.number(),
      })
      .optional(),
    openTaskCount: z.number().optional(),
    expiringIn12Months: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { portfolio_id } = inputData;
    try {
      const orgId = getOrgId(context);
      // RBAC scoping. Two paths:
      //   (a) portfolio_id given → assert it belongs to the org, scope all
      //       downstream filters to that single id.
      //   (b) no portfolio_id    → aggregate across every accessible portfolio.
      //                            Empty access set = empty result (fail-closed).
      let scopedPortfolioIds: string[];
      if (portfolio_id) {
        const ok = await assertPortfolioAccess(portfolio_id, orgId);
        if (!ok) return noAccess('portfolio');
        scopedPortfolioIds = [portfolio_id];
      } else {
        scopedPortfolioIds = await getAccessiblePortfolioIds(orgId);
        if (scopedPortfolioIds.length === 0) {
          return {
            success: true,
            totals: {
              portfolios: 0,
              properties: 0,
              leases: 0,
              processedLeases: 0,
              amendments: 0,
            },
            alertCounts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              total: 0,
            },
            openTaskCount: 0,
            expiringIn12Months: 0,
          };
        }
      }

      const db = await getDb();

      const scopeClause = { portfolio_id: { $in: scopedPortfolioIds } };
      const propertyFilter: Record<string, unknown> = { ...scopeClause };
      const leaseFilter: Record<string, unknown> = { ...scopeClause };
      const amendmentFilter: Record<string, unknown> = { ...scopeClause };
      const alertFilter: Record<string, unknown> = { ...scopeClause };
      const taskFilter: Record<string, unknown> = {
        ...scopeClause,
        category: 'task',
        is_resolved: false,
      };

      const [
        portfolioCount,
        propertyCount,
        leaseCount,
        processedLeaseCount,
        amendmentCount,
        portfolioDoc,
        alertsNew,
        alertsLegacy,
        openTaskCount,
        leases,
      ] = await Promise.all([
        db
          .collection('portfolios')
          .countDocuments(
            portfolio_id
              ? { portfolioId: portfolio_id, ...orgPortfolioFilter(orgId) }
              : orgPortfolioFilter(orgId),
          ),
        db.collection('properties').countDocuments(propertyFilter),
        db.collection('leases').countDocuments(leaseFilter),
        db
          .collection('leases')
          .countDocuments({ ...leaseFilter, status: 'processed' }),
        db.collection('amendments').countDocuments(amendmentFilter),
        portfolio_id
          ? db.collection('portfolios').findOne({
              portfolioId: portfolio_id,
              ...orgPortfolioFilter(orgId),
            })
          : Promise.resolve(null),
        db.collection('property_alerts').find(alertFilter).toArray(),
        db
          .collection('property_task_alerts')
          .find({ ...alertFilter, category: 'alert' })
          .toArray(),
        db.collection('property_task_alerts').countDocuments(taskFilter),
        db
          .collection('leases')
          .find(leaseFilter, { projection: { lease_information: 1 } })
          .toArray(),
      ]);

      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      const allAlerts = [...alertsNew, ...alertsLegacy];
      for (const a of allAlerts) {
        if (a.is_resolved) continue;
        const sev = String(a.severity ?? '').toLowerCase();
        if (sev in counts) counts[sev as keyof typeof counts]++;
      }

      // Best-effort: count leases expiring within 12 months by scanning
      // lease_information for an end_date / expiration field.
      const now = Date.now();
      const horizon = now + 365 * 24 * 60 * 60 * 1000;
      let expiringIn12Months = 0;
      for (const l of leases) {
        const info = (l.lease_information ?? {}) as Record<string, unknown>;
        const candidates = [
          info.lease_end_date,
          info.expiration_date,
          info.lease_expiration,
          info.end_date,
        ];
        for (const c of candidates) {
          if (typeof c === 'string' && c) {
            const t = Date.parse(c);
            if (!isNaN(t) && t >= now && t <= horizon) {
              expiringIn12Months++;
              break;
            }
          }
        }
      }

      const sortedAlerts = allAlerts
        .map((a) => String(a.severity ?? ''))
        .sort((a, b) => severityRank(a) - severityRank(b));
      void sortedAlerts;

      return {
        success: true,
        portfolio: portfolioDoc
          ? {
              id: String(portfolioDoc.portfolioId ?? ''),
              name: String(portfolioDoc.name ?? ''),
              property_type:
                (portfolioDoc.classification as { property_type?: string })
                  ?.property_type ?? undefined,
            }
          : undefined,
        totals: {
          portfolios: portfolioCount,
          properties: propertyCount,
          leases: leaseCount,
          processedLeases: processedLeaseCount,
          amendments: amendmentCount,
        },
        alertCounts: { ...counts, total: counts.critical + counts.high + counts.medium + counts.low },
        openTaskCount,
        expiringIn12Months,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch portfolio overview: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
