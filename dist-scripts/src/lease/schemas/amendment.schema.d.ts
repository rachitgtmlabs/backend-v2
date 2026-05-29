import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { DraftedAmendment } from './drafted-amendment.schema';
export type AmendmentDocumentModel = HydratedDocument<Amendment> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class Amendment {
    amendmentId: string;
    lease_id: string;
    version: number;
    portfolio_id: string;
    property_id: string;
    unit_id: string | null;
    status: string;
    file_name: string;
    lease_information: Record<string, unknown>;
    analysis: Record<string, unknown>;
    gcs_document_path: string | null;
    drafted_amendments: DraftedAmendment[];
    edited_by: string | null;
}
export declare const AmendmentSchema: MongooseSchema<Amendment, import("mongoose").Model<Amendment, any, any, any, import("mongoose").Document<unknown, any, Amendment, any, {}> & Amendment & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Amendment, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Amendment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Amendment> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
