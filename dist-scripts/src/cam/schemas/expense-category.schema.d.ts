import { HydratedDocument } from 'mongoose';
export type ExpenseCategoryDocumentModel = HydratedDocument<ExpenseCategory> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class ExpenseCategory {
    categoryId: string;
    portfolio_id: string | null;
    name: string;
    description: string;
    recoverable: boolean;
    is_system: boolean;
    notes: string | null;
    created_by: string | null;
}
export declare const ExpenseCategorySchema: import("mongoose").Schema<ExpenseCategory, import("mongoose").Model<ExpenseCategory, any, any, any, import("mongoose").Document<unknown, any, ExpenseCategory, any, {}> & ExpenseCategory & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ExpenseCategory, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ExpenseCategory>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ExpenseCategory> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
