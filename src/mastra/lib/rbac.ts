import type { RequestContext } from '@mastra/core/request-context';
import { getDb } from './mongo';

/**
 * Key used to store the caller's organization_id on Mastra's RequestContext.
 * Set once by chat.service.ts from the JWT; read by every RBAC-aware tool
 * via `context.requestContext.get(RBAC_ORG_ID_KEY)`.
 */
export const RBAC_ORG_ID_KEY = 'organization_id';

/**
 * Per-tool RBAC context. Mastra passes the full ToolExecutionContext as the
 * second arg to `execute`; tools call `getOrgId(context)` to pull out the
 * caller's org id without caring about Mastra's surrounding shape.
 *
 * If the caller is orgless (no JWT, expired, etc.), this returns undefined
 * and every helper below fails closed — empty list / false / no-op filter.
 */
export function getOrgId(context: unknown): string | undefined {
  const reqCtx = (context as { requestContext?: RequestContext } | undefined)
    ?.requestContext;
  if (!reqCtx || typeof reqCtx.get !== 'function') return undefined;
  const value = reqCtx.get(RBAC_ORG_ID_KEY);
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * Mongo filter clause for portfolio-collection queries. Mirrors the REST
 * API's `orgFilter()` in portfolio.service.ts. Without org_id, returns a
 * clause that matches nothing (fail-closed).
 */
export function orgPortfolioFilter(
  orgId: string | undefined,
): Record<string, unknown> {
  if (!orgId) return { _id: null };
  return { organization_id: orgId };
}

/**
 * Returns true iff the given portfolio_id belongs to the caller's org.
 * Used by detail-fetching tools (lease, property, CAM, etc.) that take a
 * portfolio_id as input — they must NOT trust the input alone.
 */
export async function assertPortfolioAccess(
  portfolioId: string | undefined,
  orgId: string | undefined,
): Promise<boolean> {
  if (!portfolioId || !orgId) return false;
  const db = await getDb();
  const found = await db
    .collection('portfolios')
    .findOne(
      { portfolioId, organization_id: orgId },
      { projection: { _id: 1 } },
    );
  return Boolean(found);
}

/**
 * Returns every portfolio_id the caller's org owns. Used by aggregation tools
 * (open tasks, risk summary, expiring leases, reminders, clause search,
 * CAM rules) that don't take a single portfolio_id — they have to enumerate
 * the user's accessible set and constrain `$in` to it.
 *
 * Empty array means "no access" — downstream queries with
 * `{ portfolio_id: { $in: [] } }` will match nothing, which is the intent.
 */
export async function getAccessiblePortfolioIds(
  orgId: string | undefined,
): Promise<string[]> {
  if (!orgId) return [];
  const db = await getDb();
  const rows = await db
    .collection('portfolios')
    .find(
      { organization_id: orgId },
      { projection: { portfolioId: 1, _id: 0 } },
    )
    .toArray();
  return rows
    .map((r) => (r.portfolioId ? String(r.portfolioId) : null))
    .filter((id): id is string => Boolean(id));
}

/** Convenience: standard "no access" tool response shape. */
export function noAccess(toolName?: string) {
  return {
    success: false,
    error: toolName
      ? `Access denied: caller has no access to the requested ${toolName} scope.`
      : 'Access denied.',
  };
}
