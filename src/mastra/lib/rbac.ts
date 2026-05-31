import type { RequestContext } from '@mastra/core/request-context';
import { getDb } from './mongo';
import { dbg } from './debug-log';

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
  const hasGet = !!reqCtx && typeof reqCtx.get === 'function';
  const rawValue = hasGet ? reqCtx!.get(RBAC_ORG_ID_KEY) : undefined;
  const result =
    typeof rawValue === 'string' && rawValue ? rawValue : undefined;
  dbg('rbac.getOrgId', {
    contextType: typeof context,
    contextKeys:
      context && typeof context === 'object'
        ? Object.keys(context as object)
        : null,
    hasRequestContext: !!reqCtx,
    requestContextType: reqCtx ? reqCtx.constructor?.name ?? typeof reqCtx : null,
    hasGet,
    rawValue: rawValue ?? null,
    result: result ?? null,
  });
  return result;
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
  if (!orgId) {
    dbg('rbac.getAccessiblePortfolioIds', { orgId: null, count: 0, ids: [], note: 'no orgId -> fail closed' });
    return [];
  }
  const db = await getDb();
  const rows = await db
    .collection('portfolios')
    .find(
      { organization_id: orgId },
      { projection: { portfolioId: 1, _id: 0 } },
    )
    .toArray();
  const ids = rows
    .map((r) => (r.portfolioId ? String(r.portfolioId) : null))
    .filter((id): id is string => Boolean(id));
  dbg('rbac.getAccessiblePortfolioIds', {
    orgId,
    dbName: db.databaseName,
    count: ids.length,
    ids,
  });
  return ids;
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
