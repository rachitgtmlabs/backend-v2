import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    if (!admin.apps.length) {
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

      try {
        if (privateKey && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
          console.log('Firebase Admin initialized with explicit service account key.');
        } else {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId,
          });
          console.log('Firebase Admin initialized with Application Default Credentials.');
        }
      } catch (error) {
        console.warn('Firebase Admin initialization failed:', error.message);
        console.warn('Auth features (Google/Phone) may not work correctly.');
      }
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(userData: any) {
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
      provider: 'local',
    });
    const { password, ...result } = user.toObject();
    return this.login(result);
  }

  async googleLogin(idToken: string) {
    if (!admin.apps.length) {
      console.error('Google Login Attempted but Firebase Admin is not initialized.');
      throw new UnauthorizedException('Authentication service is unavailable');
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, name, picture } = decodedToken;

      if (!email) {
        throw new UnauthorizedException('Google account must have an email');
      }

      const user = await this.usersService.findOrCreateSocial({
        email,
        name: name || email.split('@')[0],
        photoURL: picture,
        provider: 'google',
      });

      return this.login(user.toObject());
    } catch (error) {
      console.error('Google Token Verification Error:', error.message);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async phoneLogin(idToken: string) {
    if (!admin.apps.length) {
      console.error('Phone Login Attempted but Firebase Admin is not initialized.');
      throw new UnauthorizedException('Authentication service is unavailable');
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { phone_number } = decodedToken;

      const user = await this.usersService.findOrCreateSocial({
        phone: phone_number,
        name: `User ${phone_number}`,
        provider: 'phone',
      });

      return this.login(user.toObject());
    } catch (error) {
      console.error('Phone Token Verification Error:', error.message);
      throw new UnauthorizedException('Invalid Phone token');
    }
  }
}
