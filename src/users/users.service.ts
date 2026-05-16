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
  }): Promise<UserDocument> {
    let user;
    if (userData.email) {
      user = await this.userModel.findOne({ email: userData.email });
    } else if (userData.phone) {
      user = await this.userModel.findOne({ phone: userData.phone });
    }

    if (user) {
      if (userData.photoURL && user.photoURL !== userData.photoURL) {
        user.photoURL = userData.photoURL;
        return user.save();
      }
      return user;
    }

    return this.create(userData);
  }
}
