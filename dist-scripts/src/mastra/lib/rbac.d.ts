export declare const RBAC_ORG_ID_KEY = "organization_id";
export declare function getOrgId(context: unknown): string | undefined;
export declare function orgPortfolioFilter(orgId: string | undefined): Record<string, unknown>;
export declare function assertPortfolioAccess(portfolioId: string | undefined, orgId: string | undefined): Promise<boolean>;
export declare function getAccessiblePortfolioIds(orgId: string | undefined): Promise<string[]>;
export declare function noAccess(toolName?: string): {
    success: boolean;
    error: string;
};
