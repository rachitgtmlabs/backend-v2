import { Model } from 'mongoose';
import { CreateCamRuleDto, UpdateCamRuleDto } from '../dto/cam-rule.dto';
import { CamRuleDocumentModel } from '../schemas/cam-rule.schema';
export declare class CamRulesService {
    private readonly model;
    constructor(model: Model<CamRuleDocumentModel>);
    listForPortfolio(portfolioId: string): Promise<{
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
    getOne(portfolioId: string, ruleId: string): Promise<{
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
    findByCode(portfolioId: string, ruleCode: string): Promise<{
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
    update(portfolioId: string, ruleId: string, dto: UpdateCamRuleDto): Promise<{
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
    remove(portfolioId: string, ruleId: string): Promise<{
        ok: boolean;
    }>;
}
