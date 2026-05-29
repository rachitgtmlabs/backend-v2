"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPortfolioOverviewTool = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const mongo_1 = require("../lib/mongo");
const rbac_1 = require("../lib/rbac");
exports.fetchPortfolioOverviewTool = (0, tools_1.createTool)({
    id: 'fetch-portfolio-overview',
    description: `Returns portfolio-level KPIs: total properties, total leases, processed lease count, open alert counts (by severity), and a count of leases expiring within the next 12 months. Use when the user asks how a portfolio is performing, KPIs, totals, or a high-level summary.`,
    inputSchema: zod_1.z.object({
        portfolio_id: zod_1.z
            .string()
            .optional()
            .describe('Portfolio id. Omit to aggregate across ALL portfolios the user has.'),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        portfolio: zod_1.z
            .object({
            id: zod_1.z.string().optional(),
            name: zod_1.z.string().optional(),
            property_type: zod_1.z.string().optional(),
        })
            .optional(),
        totals: zod_1.z
            .object({
            portfolios: zod_1.z.number(),
            properties: zod_1.z.number(),
            leases: zod_1.z.number(),
            processedLeases: zod_1.z.number(),
            amendments: zod_1.z.number(),
        })
            .optional(),
        alertCounts: zod_1.z
            .object({
            critical: zod_1.z.number(),
            high: zod_1.z.number(),
            medium: zod_1.z.number(),
            low: zod_1.z.number(),
            total: zod_1.z.number(),
        })
            .optional(),
        openTaskCount: zod_1.z.number().optional(),
        expiringIn12Months: zod_1.z.number().optional(),
        error: zod_1.z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const { portfolio_id } = inputData;
        try {
            const orgId = (0, rbac_1.getOrgId)(context);
            let scopedPortfolioIds;
            if (portfolio_id) {
                const ok = await (0, rbac_1.assertPortfolioAccess)(portfolio_id, orgId);
                if (!ok)
                    return (0, rbac_1.noAccess)('portfolio');
                scopedPortfolioIds = [portfolio_id];
            }
            else {
                scopedPortfolioIds = await (0, rbac_1.getAccessiblePortfolioIds)(orgId);
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
            const db = await (0, mongo_1.getDb)();
            const scopeClause = { portfolio_id: { $in: scopedPortfolioIds } };
            const propertyFilter = { ...scopeClause };
            const leaseFilter = { ...scopeClause };
            const amendmentFilter = { ...scopeClause };
            const alertFilter = { ...scopeClause };
            const taskFilter = {
                ...scopeClause,
                category: 'task',
                is_resolved: false,
            };
            const [portfolioCount, propertyCount, leaseCount, processedLeaseCount, amendmentCount, portfolioDoc, alertsNew, alertsLegacy, openTaskCount, leases,] = await Promise.all([
                db
                    .collection('portfolios')
                    .countDocuments(portfolio_id
                    ? { portfolioId: portfolio_id, ...(0, rbac_1.orgPortfolioFilter)(orgId) }
                    : (0, rbac_1.orgPortfolioFilter)(orgId)),
                db.collection('properties').countDocuments(propertyFilter),
                db.collection('leases').countDocuments(leaseFilter),
                db
                    .collection('leases')
                    .countDocuments({ ...leaseFilter, status: 'processed' }),
                db.collection('amendments').countDocuments(amendmentFilter),
                portfolio_id
                    ? db.collection('portfolios').findOne({
                        portfolioId: portfolio_id,
                        ...(0, rbac_1.orgPortfolioFilter)(orgId),
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
                if (a.is_resolved)
                    continue;
                const sev = String(a.severity ?? '').toLowerCase();
                if (sev in counts)
                    counts[sev]++;
            }
            const now = Date.now();
            const horizon = now + 365 * 24 * 60 * 60 * 1000;
            let expiringIn12Months = 0;
            for (const l of leases) {
                const info = (l.lease_information ?? {});
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
                .sort((a, b) => (0, mongo_1.severityRank)(a) - (0, mongo_1.severityRank)(b));
            void sortedAlerts;
            return {
                success: true,
                portfolio: portfolioDoc
                    ? {
                        id: String(portfolioDoc.portfolioId ?? ''),
                        name: String(portfolioDoc.name ?? ''),
                        property_type: portfolioDoc.classification
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to fetch portfolio overview: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
//# sourceMappingURL=fetch-portfolio-overview.js.map