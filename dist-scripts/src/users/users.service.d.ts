import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    findByEmail(email: string): Promise<UserDocument | null>;
    findByPhone(phone: string): Promise<UserDocument | null>;
    findById(id: string): Promise<UserDocument | null>;
    findBriefingSubscribers(orgId: string): Promise<UserDocument[]>;
    setBriefingEmailOptIn(userId: string, enabled: boolean): Promise<boolean>;
    create(userData: Partial<User>): Promise<UserDocument>;
    findOrCreateSocial(userData: {
        email?: string;
        phone?: string;
        name: string;
        photoURL?: string;
        provider: 'google' | 'phone';
        organization_id?: string;
    }): Promise<UserDocument>;
}
