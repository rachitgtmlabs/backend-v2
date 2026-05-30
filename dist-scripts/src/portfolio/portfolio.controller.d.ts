import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { PortfolioService } from './portfolio.service';
export declare class PortfolioController {
    private readonly portfolioService;
    constructor(portfolioService: PortfolioService);
    findAll(orgId: string | undefined): Promise<{
        portfolios: {
            alert_status: "critical" | "high" | "ok";
            id: string;
            name: string;
            description: string;
            classification: import("./schemas/portfolio.schema").Classification;
            locale: import("./schemas/portfolio.schema").Locale;
            stakeholders: import("./schemas/portfolio.schema").Stakeholder[];
            document_requirements: {
                id: string;
                document_type: string;
                requirement_level: string;
            }[];
            tags: string[];
            attributes: import("./schemas/portfolio.schema").Attributes;
            status: string;
            property_count: number;
            audit: {
                created_by: string;
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        }[];
    }>;
    deletionImpact(id: string, orgId: string | undefined): Promise<{
        leases: {
            id: string;
            file_name: string;
            property_id: string | null;
            status: string;
        }[];
        amendments: {
            id: string;
            lease_id: string;
            version: number;
            file_name: string;
            property_id: string;
            status: string;
        }[];
    }>;
    findOne(id: string, orgId: string | undefined): Promise<{
        portfolio: {
            id: string;
            name: string;
            description: string;
            classification: import("./schemas/portfolio.schema").Classification;
            locale: import("./schemas/portfolio.schema").Locale;
            stakeholders: import("./schemas/portfolio.schema").Stakeholder[];
            document_requirements: {
                id: string;
                document_type: string;
                requirement_level: string;
            }[];
            tags: string[];
            attributes: import("./schemas/portfolio.schema").Attributes;
            status: string;
            property_count: number;
            audit: {
                created_by: string;
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
    }>;
    create(body: CreatePortfolioDto, userId: string | undefined, orgId: string | undefined): Promise<{
        portfolio: {
            id: string;
            name: string;
            description: string;
            classification: import("./schemas/portfolio.schema").Classification;
            locale: import("./schemas/portfolio.schema").Locale;
            stakeholders: import("./schemas/portfolio.schema").Stakeholder[];
            document_requirements: {
                id: string;
                document_type: string;
                requirement_level: string;
            }[];
            tags: string[];
            attributes: import("./schemas/portfolio.schema").Attributes;
            status: string;
            property_count: number;
            audit: {
                created_by: string;
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
    }>;
    update(id: string, body: CreatePortfolioDto, orgId: string | undefined): Promise<{
        portfolio: {
            id: string;
            name: string;
            description: string;
            classification: import("./schemas/portfolio.schema").Classification;
            locale: import("./schemas/portfolio.schema").Locale;
            stakeholders: import("./schemas/portfolio.schema").Stakeholder[];
            document_requirements: {
                id: string;
                document_type: string;
                requirement_level: string;
            }[];
            tags: string[];
            attributes: import("./schemas/portfolio.schema").Attributes;
            status: string;
            property_count: number;
            audit: {
                created_by: string;
                created_at: string;
                updated_at: string;
            };
            links: {
                self: string;
            };
        };
    }>;
    remove(id: string, orgId: string | undefined): Promise<void>;
}
