import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import type {
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { AuthService } from './auth.service';
import { PasskeyLoginVerifyDto, PasskeyRegisterVerifyDto } from './dto/passkey.dto';

// Stateless challenge: the challenge string is wrapped in a short-lived signed
// JWT handed to the client and echoed back at verify time. Avoids needing a
// server-side challenge store (Redis / TTL collection) on Cloud Run.
const CHALLENGE_TTL = '5m';
const PURPOSE_REGISTER = 'webauthn-register';
const PURPOSE_AUTHENTICATE = 'webauthn-authenticate';

interface ChallengeClaims {
  purpose: string;
  challenge: string;
  sub?: string;
}

@Injectable()
export class PasskeyService {
  private readonly logger = new Logger(PasskeyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // Relying-party config. RP ID is the registrable domain (no scheme/port);
  // origin is the full URL the browser sees. Both env vars accept a single
  // value or a comma-separated list — a Cloud Run service is reachable under
  // multiple hostnames (e.g. <svc>-<num>.<region>.run.app and the legacy
  // <svc>-<hash>-<regioncode>.a.run.app), and the origin must match whichever
  // host the browser is actually on. Registration always uses the *primary*
  // (first) RP ID; verification accepts any in the list.
  private get rpName(): string {
    return this.configService.get<string>('WEBAUTHN_RP_NAME') || 'Lease IQ';
  }
  private list(key: string, fallback: string): string[] {
    const raw = this.configService.get<string>(key);
    const value = raw && raw.trim() ? raw : fallback;
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  private get rpIDs(): string[] {
    return this.list('WEBAUTHN_RP_ID', 'localhost');
  }
  private get rpID(): string {
    return this.rpIDs[0];
  }
  private get origins(): string[] {
    const raw =
      this.configService.get<string>('WEBAUTHN_ORIGIN') ||
      this.configService.get<string>('CORS_ORIGIN');
    return this.list(
      raw ? 'WEBAUTHN_ORIGIN' : 'CORS_ORIGIN',
      'http://localhost:3000',
    );
  }

  private signChallenge(claims: ChallengeClaims): string {
    return this.jwtService.sign(claims, { expiresIn: CHALLENGE_TTL });
  }

  private verifyChallenge(token: string, expectedPurpose: string): ChallengeClaims {
    let claims: ChallengeClaims;
    try {
      claims = this.jwtService.verify<ChallengeClaims>(token);
    } catch {
      throw new BadRequestException('Challenge expired or invalid');
    }
    if (claims.purpose !== expectedPurpose || !claims.challenge) {
      throw new BadRequestException('Challenge purpose mismatch');
    }
    return claims;
  }

  // --- Enrollment (caller is already authenticated) -----------------------

  async generateRegistrationOptions(user: UserDocument): Promise<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeToken: string;
  }> {
    const userId = String(user._id);
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: isoUint8Array.fromUTF8String(userId),
      userName: user.email || user.name || userId,
      userDisplayName: user.name || user.email || userId,
      attestationType: 'none',
      // Don't let a user enroll the same authenticator twice.
      excludeCredentials: (user.webauthnCredentials || []).map((c) => ({
        id: c.credentialId,
        transports: c.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        // Discoverable (resident) key so login needs no username up front.
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    const challengeToken = this.signChallenge({
      purpose: PURPOSE_REGISTER,
      challenge: options.challenge,
      sub: userId,
    });
    return { options, challengeToken };
  }

  async verifyRegistration(
    user: UserDocument,
    dto: PasskeyRegisterVerifyDto,
  ): Promise<{ verified: boolean }> {
    const claims = this.verifyChallenge(dto.challengeToken, PURPOSE_REGISTER);
    if (claims.sub !== String(user._id)) {
      throw new UnauthorizedException('Challenge does not belong to this user');
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: dto.response,
        expectedChallenge: claims.challenge,
        expectedOrigin: this.origins,
        expectedRPID: this.rpIDs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Passkey registration verification failed: ${message}`);
      throw new BadRequestException('Passkey registration could not be verified');
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey registration was not verified');
    }

    const { credential } = verification.registrationInfo;
    await this.usersService.addWebauthnCredential(String(user._id), {
      credentialId: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: (credential.transports as string[]) || [],
    });

    return { verified: true };
  }

  // --- Login (public) ------------------------------------------------------

  async generateAuthenticationOptions(): Promise<{
    options: PublicKeyCredentialRequestOptionsJSON;
    challengeToken: string;
  }> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      // Empty allowCredentials → rely on discoverable credentials; the browser
      // lets the user pick which passkey to present.
      allowCredentials: [],
      userVerification: 'preferred',
    });

    const challengeToken = this.signChallenge({
      purpose: PURPOSE_AUTHENTICATE,
      challenge: options.challenge,
    });
    return { options, challengeToken };
  }

  async verifyAuthentication(dto: PasskeyLoginVerifyDto) {
    const claims = this.verifyChallenge(dto.challengeToken, PURPOSE_AUTHENTICATE);

    const credentialId = dto.response.id;
    const user = await this.usersService.findByCredentialId(credentialId);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Unknown or inactive passkey');
    }
    const stored = (user.webauthnCredentials || []).find(
      (c) => c.credentialId === credentialId,
    );
    if (!stored) {
      throw new UnauthorizedException('Unknown passkey');
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: dto.response,
        expectedChallenge: claims.challenge,
        expectedOrigin: this.origins,
        expectedRPID: this.rpIDs,
        credential: {
          id: stored.credentialId,
          publicKey: isoBase64URL.toBuffer(stored.publicKey),
          counter: stored.counter,
          transports: stored.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Passkey authentication failed: ${message}`);
      throw new UnauthorizedException('Passkey authentication failed');
    }

    if (!verification.verified) {
      throw new UnauthorizedException('Passkey authentication failed');
    }

    await this.usersService.updateCredentialCounter(
      String(user._id),
      credentialId,
      verification.authenticationInfo.newCounter,
    );

    // Reuse the shared login path so the JWT + user payload exactly matches
    // every other auth method (Google, phone, local).
    const { password: _password, ...safeUser } = user.toObject();
    void _password;
    return this.authService.login(safeUser);
  }
}
