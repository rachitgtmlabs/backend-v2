import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { OrganizationsService } from '../organizations/organizations.service';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { PasswordCryptoService } from './password-crypto.service';

type SafeUser = Omit<Record<string, unknown>, 'password'> & {
  _id: unknown;
  email?: string;
  name?: string;
  organization_id?: string;
};

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private organizationsService: OrganizationsService,
    private passwordCrypto: PasswordCryptoService,
  ) {
    this.initializeFirebase();
  }

  /** Enforce password strength on the decrypted plaintext (see RegisterDto). */
  private assertPasswordStrength(plaintext: string) {
    if (
      plaintext.length < 8 ||
      plaintext.length > 128 ||
      !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(plaintext)
    ) {
      throw new BadRequestException(
        'Password must be 8-128 characters and contain at least one letter and one number',
      );
    }
  }

  private initializeFirebase() {
    if (admin.apps.length) return;

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
        this.logger.log('Firebase Admin initialized with service account key');
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
        });
        this.logger.log(
          'Firebase Admin initialized with Application Default Credentials',
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Firebase Admin initialization failed: ${message}`);
      this.logger.warn('Google/Phone auth will be unavailable until fixed.');
    }
  }

  async validateUser(email: string, pass: string): Promise<SafeUser | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) return null;
    // `pass` arrives RSA-OAEP encrypted from the browser; decrypt before compare.
    const plaintext = this.passwordCrypto.decrypt(pass);
    const matches = await bcrypt.compare(plaintext, user.password);
    if (!matches) return null;
    const { password: _password, ...result } = user.toObject();
    void _password;
    return result as SafeUser;
  }

  async login(user: SafeUser | UserDocument | Express.User) {
    let u = user as SafeUser;

    // Backfill organization_id for accounts created before the org system
    // (local-auth register, early passkey enrollments). Without this the
    // PortfolioAccessGuard always returns 403 for these users.
    if (!u.organization_id && u.email) {
      try {
        const org = await this.organizationsService.resolveForEmail(u.email as string);
        const updated = await this.usersService.setOrgId(String(u._id), org.orgId);
        if (updated) {
          const { password: _p, ...safe } = updated.toObject();
          void _p;
          u = safe as SafeUser;
        }
      } catch (err) {
        this.logger.warn(
          `Could not backfill organization_id for ${u.email}: ${(err as Error).message}`,
        );
      }
    }

    const payload: {
      email?: string;
      sub: unknown;
      org?: string;
    } = { email: u.email, sub: u._id };
    if (u.organization_id) payload.org = u.organization_id;
    return {
      access_token: this.jwtService.sign(payload),
      user: u,
    };
  }

  async register(userData: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }
    // Decrypt the RSA-OAEP transport ciphertext, validate strength on the
    // plaintext, then bcrypt-hash it for storage.
    const plaintext = this.passwordCrypto.decrypt(userData.password);
    this.assertPasswordStrength(plaintext);
    const hashedPassword = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
      provider: 'local',
    });
    const { password: _password, ...result } = user.toObject();
    void _password;
    return this.login(result as SafeUser);
  }

  async googleLogin(idToken: string) {
    if (!admin.apps.length) {
      this.logger.error(
        'Google login attempted but Firebase Admin is not initialized',
      );
      throw new UnauthorizedException('Authentication service is unavailable');
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, name, picture, email_verified } = decodedToken;

      if (!email) {
        throw new UnauthorizedException('Google account must have an email');
      }
      if (email_verified === false) {
        throw new UnauthorizedException('Google email is not verified');
      }

      const org = await this.organizationsService.resolveForEmail(email);

      const user = await this.usersService.findOrCreateSocial({
        email,
        name: name || email.split('@')[0],
        photoURL: picture,
        provider: 'google',
        organization_id: org.orgId,
      });

      return this.login(user.toObject() as SafeUser);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Google token verification failed: ${message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async phoneLogin(idToken: string) {
    if (!admin.apps.length) {
      this.logger.error(
        'Phone login attempted but Firebase Admin is not initialized',
      );
      throw new UnauthorizedException('Authentication service is unavailable');
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { phone_number } = decodedToken;

      if (!phone_number) {
        throw new UnauthorizedException('Phone token missing phone_number');
      }

      const user = await this.usersService.findOrCreateSocial({
        phone: phone_number,
        name: `User ${phone_number}`,
        provider: 'phone',
      });

      return this.login(user.toObject() as SafeUser);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Phone token verification failed: ${message}`);
      throw new UnauthorizedException('Invalid Phone token');
    }
  }
}
