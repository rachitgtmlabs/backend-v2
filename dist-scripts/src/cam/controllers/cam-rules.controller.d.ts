import { CreateCamRuleDto, UpdateCamRuleDto } from '../dto/cam-rule.dto';
import { CamRulesService } from '../services/cam-rules.service';
export declare class CamRulesController {
    private readonly svc;
    constructor(svc: CamRulesService);
    list(portfolioId: string | undefined): Promise<{
        ruleId: any;
        portfolio_id: any;
        rule_code: any;
        rule_name: any;
        description: any;
        base_amount: any;
        base_year: any;
        share_pct: any;
        admin_fee_pct: any;
        exclusions: any;
        created_by: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    getByCode(ruleCode: string, portfolioId: string | undefined): Promise<{
        ruleId: any;
        portfolio_id: any;
        rule_code: any;
        rule_name: any;
        description: any;
        base_amount: any;
        base_year: any;
        share_pct: any;
        admin_fee_pct: any;
        exclusions: any;
        created_by: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    getOne(ruleId: string, portfolioId: string | undefined): Promise<{
        ruleId: any;
        portfolio_id: any;
        rule_code: any;
        rule_name: any;
        description: any;
        base_amount: any;
        base_year: any;
        share_pct: any;
        admin_fee_pct: any;
        exclusions: any;
        created_by: any;
        createdAt: any;
        updatedAt: any;
    }>;
    create(dto: CreateCamRuleDto): Promise<{
        ruleId: any;
        portfolio_id: any;
        rule_code: any;
        rule_name: any;
        description: any;
        base_amount: any;
        base_year: any;
        share_pct: any;
        admin_fee_pct: any;
        exclusions: any;
        created_by: any;
        createdAt: any;
        updatedAt: any;
    }>;
    update(ruleId: string, portfolioId: string | undefined, dto: UpdateCamRuleDto): Promise<{
        ruleId: any;
        portfolio_id: any;
        rule_code: any;
        rule_name: any;
        description: any;
        base_amount: any;
        base_year: any;
        share_pct: any;
        admin_fee_pct: any;
        exclusions: any;
        created_by: any;
        createdAt: any;
        updatedAt: any;
    }>;
    delete(ruleId: string, portfolioId: string | undefined): Promise<{
        ok: boolean;
    }>;
}
