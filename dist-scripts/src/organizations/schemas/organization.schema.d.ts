import { HydratedDocument } from 'mongoose';
export type OrganizationKind = 'domain' | 'personal';
export type OrganizationDocument = HydratedDocument<Organization>;
export declare class Organization {
    orgId: string;
    name: string;
    domain: string;
    kind: OrganizationKind;
}
export declare const OrganizationSchema: import("mongoose").Schema<Organization, import("mongoose").Model<Organization, any, any, any, import("mongoose").Document<unknown, any, Organization, any, {}> & Organization & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Organization, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Organization>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Organization> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
