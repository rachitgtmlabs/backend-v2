import { fetchLeaseDocumentTool } from './fetch-lease-document';
import { fetchTasksAlertsTool } from './fetch-tasks-alerts';
import { listPortfoliosTool } from './list-portfolios';
import { searchPortfoliosTool } from './search-portfolios';
import { searchPropertiesTool } from './search-properties';
import { fetchPortfolioOverviewTool } from './fetch-portfolio-overview';
import { fetchPropertyDetailsTool } from './fetch-property-details';
import { fetchLeaseEvolutionTool } from './fetch-lease-evolution';
import { fetchAmendmentHistoryTool } from './fetch-amendment-history';
import { fetchRiskSummaryTool } from './fetch-risk-summary';
import { fetchOpenTasksTool } from './fetch-open-tasks';
import { fetchExpiringLeasesTool } from './fetch-expiring-leases';
import { fetchCamDataTool } from './fetch-cam-data';
import { fetchCamRulesTool } from './fetch-cam-rules';
import { fetchCamReconciliationTool } from './fetch-cam-reconciliation';
import { fetchLeaseClausesTool } from './fetch-lease-clauses';
import { fetchRemindersTool } from './fetch-reminders';
import type { ToolName } from '../workflows/schemas';

/** Minimal shape needed by the resolution step to execute a tool. */
type ExecutableTool = {
  id: string;
  description?: string;
  execute: (input: any, ctx?: any) => Promise<unknown>;
};

/** Map of toolName -> tool definition. Single source of truth for the resolver. */
export const TOOL_REGISTRY: Record<ToolName, ExecutableTool> = {
  'search-portfolios': searchPortfoliosTool as unknown as ExecutableTool,
  'search-properties': searchPropertiesTool as unknown as ExecutableTool,
  'list-portfolios': listPortfoliosTool as unknown as ExecutableTool,
  'fetch-lease-document': fetchLeaseDocumentTool as unknown as ExecutableTool,
  'fetch-tasks-alerts': fetchTasksAlertsTool as unknown as ExecutableTool,
  'fetch-portfolio-overview':
    fetchPortfolioOverviewTool as unknown as ExecutableTool,
  'fetch-property-details':
    fetchPropertyDetailsTool as unknown as ExecutableTool,
  'fetch-lease-evolution':
    fetchLeaseEvolutionTool as unknown as ExecutableTool,
  'fetch-amendment-history':
    fetchAmendmentHistoryTool as unknown as ExecutableTool,
  'fetch-risk-summary': fetchRiskSummaryTool as unknown as ExecutableTool,
  'fetch-open-tasks': fetchOpenTasksTool as unknown as ExecutableTool,
  'fetch-expiring-leases':
    fetchExpiringLeasesTool as unknown as ExecutableTool,
  'fetch-cam-data': fetchCamDataTool as unknown as ExecutableTool,
  'fetch-cam-rules': fetchCamRulesTool as unknown as ExecutableTool,
  'fetch-cam-reconciliation':
    fetchCamReconciliationTool as unknown as ExecutableTool,
  'fetch-lease-clauses': fetchLeaseClausesTool as unknown as ExecutableTool,
  'fetch-reminders': fetchRemindersTool as unknown as ExecutableTool,
};

/** Short description of every tool, used in the orchestrator system prompt. */
export const TOOL_DIRECTORY: Array<{
  name: ToolName;
  when: string;
  inputs: string;
  isDynamic: boolean;
}> = [
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
    when: 'CAM/operating-expense clauses for one lease + CAM-tagged alerts.',
    inputs: '{ portfolio_id, property_id, lease_id? }',
    isDynamic: false,
  },
  {
    name: 'fetch-cam-rules',
    when: "Portfolio's reusable CAM rule templates (rule_code, share %, base year, exclusions).",
    inputs: '{ portfolio_id, rule_code?, query?, limit? }',
    isDynamic: false,
  },
  {
    name: 'fetch-cam-reconciliation',
    when: "Audit-reconciliation history ('Reconcile YYYY' runs): per-unit deltas, preview vs applied, adjustments_created.",
    inputs: '{ portfolio_id, property_id?, runId?, calendar_year?, mode?, unit_id?, limit? }',
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
