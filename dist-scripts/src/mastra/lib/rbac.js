"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBAC_ORG_ID_KEY = void 0;
exports.getOrgId = getOrgId;
exports.orgPortfolioFilter = orgPortfolioFilter;
exports.assertPortfolioAccess = assertPortfolioAccess;
exports.getAccessiblePortfolioIds = getAccessiblePortfolioIds;
exports.noAccess = noAccess;
const mongo_1 = require("./mongo");
exports.RBAC_ORG_ID_KEY = 'organization_id';
function getOrgId(context) {
    const reqCtx = context
        ?.requestContext;
    if (!reqCtx || typeof reqCtx.get !== 'function')
        return undefined;
    const value = reqCtx.get(exports.RBAC_ORG_ID_KEY);
    return typeof value === 'string' && value ? value : undefined;
}
function orgPortfolioFilter(orgId) {
    if (!orgId)
        return { _id: null };
    return { organization_id: orgId };
}
async function assertPortfolioAccess(portfolioId, orgId) {
    if (!portfolioId || !orgId)
        return false;
    const db = await (0, mongo_1.getDb)();
    const found = await db
        .collection('portfolios')
        .findOne({ portfolioId, organization_id: orgId }, { projection: { _id: 1 } });
    return Boolean(found);
}
async function getAccessiblePortfolioIds(orgId) {
    if (!orgId)
        return [];
    const db = await (0, mongo_1.getDb)();
    const rows = await db
        .collection('portfolios')
        .find({ organization_id: orgId }, { projection: { portfolioId: 1, _id: 0 } })
        .toArray();
    return rows
        .map((r) => (r.portfolioId ? String(r.portfolioId) : null))
        .filter((id) => Boolean(id));
}
function noAccess(toolName) {
    return {
        success: false,
        error: toolName
            ? `Access denied: caller has no access to the requested ${toolName} scope.`
            : 'Access denied.',
    };
}
//# sourceMappingURL=rbac.js.map