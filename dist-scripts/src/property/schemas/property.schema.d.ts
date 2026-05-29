import { HydratedDocument } from 'mongoose';
export type PropertyDocumentModel = HydratedDocument<Property> & {
    createdAt: Date;
    updatedAt: Date;
};
export type PropertyKind = 'single_unit' | 'multi_unit';
export declare class Property {
    propertyId: string;
    portfolio_id: string;
    property_name: string;
    address: string;
    property_type: string;
    thumbnail_url: string | null;
    property_kind: PropertyKind;
}
export declare const PropertySchema: import("mongoose").Schema<Property, import("mongoose").Model<Property, any, any, any, import("mongoose").Document<unknown, any, Property, any, {}> & Property & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Property, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Property>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Property> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
