import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /** Find the user who owns a given passkey credential (by base64url id). */
  async findByCredentialId(
    credentialId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ 'webauthnCredentials.credentialId': credentialId })
      .exec();
  }

  /** Append a freshly-registered passkey credential to a user. */
  async addWebauthnCredential(
    userId: string,
    credential: {
      credentialId: string;
      publicKey: string;
      counter: number;
      transports: string[];
    },
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        { $push: { webauthnCredentials: { ...credential, createdAt: new Date() } } },
      )
      .exec();
  }

  /** Bump a credential's signature counter after a successful assertion. */
  async updateCredentialCounter(
    userId: string,
    credentialId: string,
    counter: number,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId, 'webauthnCredentials.credentialId': credentialId },
        { $set: { 'webauthnCredentials.$.counter': counter } },
      )
      .exec();
  }

  /** Users in an org who have opted into the daily-briefing email and have an
   * email address on file. Used by the briefing notifier. */
  async findBriefingSubscribers(orgId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({
        organization_id: orgId,
        briefingEmailOptIn: true,
        email: { $exists: true, $ne: null },
      })
      .exec();
  }

  /** Toggle a user's daily-briefing email subscription. Returns the new state. */
  async setBriefingEmailOptIn(
    userId: string,
    enabled: boolean,
  ): Promise<boolean> {
    await this.userModel
      .updateOne({ _id: userId }, { $set: { briefingEmailOptIn: enabled } })
      .exec();
    return enabled;
  }

  /** Set organization_id on a user who doesn't have one yet (backfill). */
  async setOrgId(userId: string, orgId: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { organization_id: orgId } },
        { new: true },
      )
      .exec();
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async findOrCreateSocial(userData: {
    email?: string;
    phone?: string;
    name: string;
    photoURL?: string;
    provider: 'google' | 'phone';
    organization_id?: string;
  }): Promise<UserDocument> {
    let user;
    if (userData.email) {
      user = await this.userModel.findOne({ email: userData.email });
    } else if (userData.phone) {
      user = await this.userModel.findOne({ phone: userData.phone });
    }

    if (user) {
      let dirty = false;
      if (userData.photoURL && user.photoURL !== userData.photoURL) {
        user.photoURL = userData.photoURL;
        dirty = true;
      }
      if (userData.organization_id && user.organization_id !== userData.organization_id) {
        user.organization_id = userData.organization_id;
        dirty = true;
      }
      return dirty ? user.save() : user;
    }

    return this.create(userData);
  }
}
