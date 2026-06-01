import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
import { PasswordCryptoService } from './password-crypto.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import {
  PasskeyLoginVerifyDto,
  PasskeyRegisterVerifyDto,
} from './dto/passkey.dto';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private passkeyService: PasskeyService,
    private passwordCrypto: PasswordCryptoService,
  ) {}

  /**
   * Public RSA public key (SPKI PEM) the browser uses to encrypt the password
   * before sending it on signup/login, so the plaintext never hits the wire.
   */
  @Public()
  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.passwordCrypto.getPublicKeyPem() };
  }

  @Public()
  @Post('register')
  async register(@Body() userData: RegisterDto) {
    return this.authService.register(userData);
  }

  // Alias so the frontend's POST /v1/auth/signup resolves to the same logic.
  @Public()
  @Post('signup')
  async signup(@Body() userData: RegisterDto) {
    return this.authService.register(userData);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: ExpressRequest) {
    if (!req.user) {
      throw new UnauthorizedException('Authentication failed');
    }
    return this.authService.login(req.user);
  }

  @Public()
  @Post('google')
  async googleLogin(@Body() body: SocialLoginDto) {
    return this.authService.googleLogin(body.token);
  }

  @Public()
  @Post('phone')
  async phoneLogin(@Body() body: SocialLoginDto) {
    return this.authService.phoneLogin(body.token);
  }

  @Get('profile')
  getProfile(@Request() req: ExpressRequest) {
    return req.user;
  }

  // --- Passkey enrollment (requires an authenticated user) -----------------

  @Post('passkey/register/options')
  passkeyRegisterOptions(@Request() req: ExpressRequest) {
    return this.passkeyService.generateRegistrationOptions(
      req.user as UserDocument,
    );
  }

  @Post('passkey/register/verify')
  passkeyRegisterVerify(
    @Request() req: ExpressRequest,
    @Body() body: PasskeyRegisterVerifyDto,
  ) {
    return this.passkeyService.verifyRegistration(
      req.user as UserDocument,
      body,
    );
  }

  // --- Passkey login (public) ---------------------------------------------

  @Public()
  @Post('passkey/login/options')
  passkeyLoginOptions() {
    return this.passkeyService.generateAuthenticationOptions();
  }

  @Public()
  @Post('passkey/login/verify')
  passkeyLoginVerify(@Body() body: PasskeyLoginVerifyDto) {
    return this.passkeyService.verifyAuthentication(body);
  }
}
