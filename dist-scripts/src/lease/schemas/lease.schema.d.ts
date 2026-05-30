import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { DraftedAmendment } from './drafted-amendment.schema';
export type LeaseDocumentModel = HydratedDocument<Lease> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class Lease {
    leaseId: string;
    portfolio_id: string;
    property_id: string | null;
    unit_id: string | null;
    status: string;
    file_name: string;
    lease_information: Record<string, unknown>;
    analysis: Record<string, unknown>;
    amendment_version: number;
    gcs_document_path: string | null;
    drafted_amendments: DraftedAmendment[];
}
export declare const LeaseSchema: MongooseSchema<Lease, import("mongoose").Model<Lease, any, any, any, import("mongoose").Document<unknown, any, Lease, any, {}> & Lease & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Lease, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Lease>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Lease> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
