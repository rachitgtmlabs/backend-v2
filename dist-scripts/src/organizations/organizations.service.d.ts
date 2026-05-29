import { Model } from 'mongoose';
import { OrganizationDocument } from './schemas/organization.schema';
export declare class OrganizationsService {
    private readonly orgModel;
    constructor(orgModel: Model<OrganizationDocument>);
    resolveForEmail(emailRaw: string): Promise<OrganizationDocument>;
    findByOrgId(orgId: string): Promise<OrganizationDocument | null>;
    listAll(): Promise<OrganizationDocument[]>;
}
