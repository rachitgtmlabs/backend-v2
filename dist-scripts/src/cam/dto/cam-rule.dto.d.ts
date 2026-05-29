export declare class CreateCamRuleDto {
    portfolio_id: string;
    rule_code: string;
    rule_name: string;
    description?: string;
    base_amount: number;
    base_year: number;
    share_pct: number;
    admin_fee_pct?: number | null;
    exclusions?: string[];
}
export declare class UpdateCamRuleDto {
    rule_code?: string;
    rule_name?: string;
    description?: string;
    base_amount?: number;
    base_year?: number;
    share_pct?: number;
    admin_fee_pct?: number | null;
    exclusions?: string[];
}
