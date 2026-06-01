import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  constants,
  type KeyObject,
} from 'crypto';

/**
 * RSA-OAEP (SHA-256) transport encryption for passwords.
 *
 * The browser encrypts the user's password with the public key (served at
 * GET /v1/auth/public-key) before it leaves the page, so the plaintext never
 * appears in the request payload. The backend decrypts here with the private
 * key, then the auth service bcrypt-hashes it for storage.
 *
 * Only the email/password flow uses this — Google and passkey logins never
 * touch it, so a missing key never breaks those paths.
 */
@Injectable()
export class PasswordCryptoService {
  private readonly logger = new Logger(PasswordCryptoService.name);
  private privateKey: KeyObject | null = null;
  private publicKeyPem: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.loadKey();
  }

  private loadKey() {
    const raw = this.configService.get<string>('PASSWORD_RSA_PRIVATE_KEY');
    if (!raw) {
      this.logger.warn(
        'PASSWORD_RSA_PRIVATE_KEY not set — email/password signup & login are disabled until it is configured (Google/passkey are unaffected).',
      );
      return;
    }
    try {
      // .env stores the PEM with literal \n; restore real newlines.
      const pem = raw.replace(/\\n/g, '\n');
      this.privateKey = createPrivateKey(pem);
      this.publicKeyPem = createPublicKey(this.privateKey)
        .export({ type: 'spki', format: 'pem' })
        .toString();
      this.logger.log('Password RSA keypair loaded.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to load PASSWORD_RSA_PRIVATE_KEY: ${message}`);
    }
  }

  isConfigured(): boolean {
    return this.privateKey !== null;
  }

  /** SPKI PEM of the public key, for the browser to encrypt with. */
  getPublicKeyPem(): string {
    if (!this.publicKeyPem) {
      throw new ServiceUnavailableException(
        'Password encryption is not configured on the server',
      );
    }
    return this.publicKeyPem;
  }

  /**
   * Decrypt a base64 RSA-OAEP(SHA-256) ciphertext back to the plaintext
   * password. Throws BadRequest on malformed input so a garbled payload reads
   * as a client error rather than a 500.
   */
  decrypt(ciphertextB64: string): string {
    if (!this.privateKey) {
      throw new ServiceUnavailableException(
        'Password encryption is not configured on the server',
      );
    }
    let buf: Buffer;
    try {
      buf = privateDecrypt(
        {
          key: this.privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(ciphertextB64, 'base64'),
      );
    } catch {
      throw new BadRequestException('Could not decrypt password payload');
    }
    return buf.toString('utf8');
  }
}
