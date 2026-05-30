import { HydratedDocument } from 'mongoose';
export type PortfolioDocumentModel = HydratedDocument<Portfolio> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class Classification {
    property_type: string;
}
export declare class Locale {
    timezone: string;
    currency: string;
    measurement_system: string;
}
export declare class Stakeholder {
    id: string;
    name: string;
    role: string;
}
export declare class DocumentRequirement {
    docRequirementId: string;
    document_type: string;
    requirement_level: string;
}
export declare class Attributes {
    custom_fields: Record<string, unknown>;
    source: string;
}
export declare class Portfolio {
    portfolioId: string;
    name: string;
    description: string;
    classification: Classification;
    locale: Locale;
    stakeholders: Stakeholder[];
    document_requirements: DocumentRequirement[];
    tags: string[];
    attributes: Attributes;
    status: string;
    created_by: string;
    organization_id?: string;
}
export declare const PortfolioSchema: import("mongoose").Schema<Portfolio, import("mongoose").Model<Portfolio, any, any, any, import("mongoose").Document<unknown, any, Portfolio, any, {}> & Portfolio & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Portfolio, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Portfolio>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Portfolio> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
