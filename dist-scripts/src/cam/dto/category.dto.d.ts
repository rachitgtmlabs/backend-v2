export declare class CreateCategoryDto {
    portfolio_id: string;
    name: string;
    description?: string;
    recoverable?: boolean;
    notes?: string;
}
export declare class UpdateCategoryDto {
    name?: string;
    description?: string;
    recoverable?: boolean;
    notes?: string;
}
