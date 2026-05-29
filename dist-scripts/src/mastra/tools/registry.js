"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DIRECTORY = exports.TOOL_REGISTRY = void 0;
const fetch_lease_document_1 = require("./fetch-lease-document");
const fetch_tasks_alerts_1 = require("./fetch-tasks-alerts");
const list_portfolios_1 = require("./list-portfolios");
const search_portfolios_1 = require("./search-portfolios");
const search_properties_1 = require("./search-properties");
const fetch_portfolio_overview_1 = require("./fetch-portfolio-overview");
const fetch_property_details_1 = require("./fetch-property-details");
const fetch_lease_evolution_1 = require("./fetch-lease-evolution");
const fetch_amendment_history_1 = require("./fetch-amendment-history");
const fetch_risk_summary_1 = require("./fetch-risk-summary");
const fetch_open_tasks_1 = require("./fetch-open-tasks");
const fetch_expiring_leases_1 = require("./fetch-expiring-leases");
const fetch_cam_data_1 = require("./fetch-cam-data");
const fetch_lease_clauses_1 = require("./fetch-lease-clauses");
const fetch_reminders_1 = require("./fetch-reminders");
exports.TOOL_REGISTRY = {
    'search-portfolios': search_portfolios_1.searchPortfoliosTool,
    'search-properties': search_properties_1.searchPropertiesTool,
    'list-portfolios': list_portfolios_1.listPortfoliosTool,
    'fetch-lease-document': fetch_lease_document_1.fetchLeaseDocumentTool,
    'fetch-tasks-alerts': fetch_tasks_alerts_1.fetchTasksAlertsTool,
    'fetch-portfolio-overview': fetch_portfolio_overview_1.fetchPortfolioOverviewTool,
    'fetch-property-details': fetch_property_details_1.fetchPropertyDetailsTool,
    'fetch-lease-evolution': fetch_lease_evolution_1.fetchLeaseEvolutionTool,
    'fetch-amendment-history': fetch_amendment_history_1.fetchAmendmentHistoryTool,
    'fetch-risk-summary': fetch_risk_summary_1.fetchRiskSummaryTool,
    'fetch-open-tasks': fetch_open_tasks_1.fetchOpenTasksTool,
    'fetch-expiring-leases': fetch_expiring_leases_1.fetchExpiringLeasesTool,
    'fetch-cam-data': fetch_cam_data_1.fetchCamDataTool,
    'fetch-lease-clauses': fetch_lease_clauses_1.fetchLeaseClausesTool,
    'fetch-reminders': fetch_reminders_1.fetchRemindersTool,
};
exports.TOOL_DIRECTORY = [
    {
        name: 'list-portfolios',
        when: 'User wants a full catalog of portfolios, or no name was given.',
        inputs: '{}',
        isDynamic: false,
    },
    {
        name: 'search-portfolios',
        when: 'User mentioned a portfolio by name and the portfolio_id is unknown.',
        inputs: '{ query: string, limit?: number }',
        isDynamic: true,
    },
    {
        name: 'search-properties',
        when: 'User mentioned a property by name and the property_id is unknown. May also be filtered by portfolio_id.',
        inputs: '{ property_name?: string, portfolio_id?: string }',
        isDynamic: true,
    },
    {
        name: 'fetch-portfolio-overview',
        when: 'Portfolio-level KPIs / totals / "how is portfolio X doing?". Works without portfolio_id (aggregates across all portfolios).',
        inputs: '{ portfolio_id?: string }',
        isDynamic: false,
    },
    {
        name: 'fetch-property-details',
        when: '"Tell me about <property>" — single-property snapshot with latest lease + counts.',
        inputs: '{ portfolio_id, property_id }',
        isDynamic: false,
    },
    {
        name: 'fetch-lease-document',
        when: 'Lease terms/clauses for a specific lease (rent, dates, options, etc). Returns lease + amendments merged.',
        inputs: '{ portfolio_id, property_id, lease_id }',
        isDynamic: false,
    },
    {
        name: 'fetch-lease-evolution',
        when: 'Chronological view: how a lease changed across amendments.',
        inputs: '{ lease_id }',
        isDynamic: false,
    },
    {
        name: 'fetch-amendment-history',
        when: 'Field-level change log: "when did rent change?", "has CAM ever been amended?".',
        inputs: '{ lease_id, fieldFilter?: string }',
        isDynamic: false,
    },
    {
        name: 'fetch-tasks-alerts',
        when: 'Tasks AND alerts for one specific lease (the existing Tasks & Alerts tab data).',
        inputs: '{ portfolio_id, property_id, lease_id? }',
        isDynamic: false,
    },
    {
        name: 'fetch-open-tasks',
        when: 'Open tasks across portfolio or property — "what is on my plate?".',
        inputs: '{ portfolio_id?, property_id?, limit? }',
        isDynamic: false,
    },
    {
        name: 'fetch-risk-summary',
        when: 'Risks across portfolio/property — "biggest risks", "what is exposed".',
        inputs: "{ portfolio_id?, property_id?, minSeverity?: 'critical'|'high'|'medium'|'low' }",
        isDynamic: false,
    },
    {
        name: 'fetch-expiring-leases',
        when: 'Lease-expiration questions across a portfolio/property within a time window.',
        inputs: '{ portfolio_id?, property_id?, withinDays?: number }',
        isDynamic: false,
    },
    {
        name: 'fetch-cam-data',
        when: 'CAM/operating-expense clauses for one lease + CAM-tagged alerts. NOTE: billed-vs-entitled reconciliation is not yet available.',
        inputs: '{ portfolio_id, property_id, lease_id? }',
        isDynamic: false,
    },
    {
        name: 'fetch-lease-clauses',
        when: 'Portfolio-wide clause search by keyword — "which leases have a termination option?".',
        inputs: '{ portfolio_id?, property_id?, keyword: string }',
        isDynamic: false,
    },
    {
        name: 'fetch-reminders',
        when: 'Upcoming deadlines and reminders across leases.',
        inputs: '{ portfolio_id?, property_id?, withinDays?: number }',
        isDynamic: false,
    },
];
//# sourceMappingURL=registry.js.map