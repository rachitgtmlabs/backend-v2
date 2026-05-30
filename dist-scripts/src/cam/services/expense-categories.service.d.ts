import { Model } from 'mongoose';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { ExpenseCategoryDocumentModel } from '../schemas/expense-category.schema';
export declare class ExpenseCategoriesService {
    private readonly model;
    constructor(model: Model<ExpenseCategoryDocumentModel>);
    listForPortfolio(portfolioId: string): Promise<{
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
    createCustom(dto: CreateCategoryDto): Promise<{
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
    updateCustom(portfolioId: string, categoryId: string, dto: UpdateCategoryDto): Promise<{
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
    deleteCustom(portfolioId: string, categoryId: string): Promise<{
        ok: boolean;
    }>;
    findByName(portfolioId: string, name: string): Promise<ExpenseCategoryDocumentModel | null>;
}
