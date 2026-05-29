import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { ExpenseCategoriesService } from '../services/expense-categories.service';
export declare class ExpenseCategoriesController {
    private readonly svc;
    constructor(svc: ExpenseCategoriesService);
    list(portfolioId: string | undefined): Promise<{
        categoryId: any;
        portfolio_id: any;
        name: any;
        description: any;
        recoverable: any;
        is_system: any;
        notes: any;
        created_by: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    create(dto: CreateCategoryDto): Promise<{
        categoryId: any;
        portfolio_id: any;
        name: any;
        description: any;
        recoverable: any;
        is_system: any;
        notes: any;
        created_by: any;
        createdAt: any;
        updatedAt: any;
    }>;
    update(categoryId: string, portfolioId: string | undefined, dto: UpdateCategoryDto): Promise<{
        categoryId: any;
        portfolio_id: any;
        name: any;
        description: any;
        recoverable: any;
        is_system: any;
        notes: any;
        created_by: any;
        createdAt: any;
        updatedAt: any;
    }>;
    delete(categoryId: string, portfolioId: string | undefined): Promise<{
        ok: boolean;
    }>;
}
