import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  email?: string;
  sub: string;
  iat?: number;
  exp?: number;
}

function resolveJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret || secret.length < 16) {
    const logger = new Logger('JwtStrategy');
    logger.error(
      'JWT_SECRET is missing or too short (< 16 chars). Refusing to start with an insecure default.',
    );
    throw new Error(
      'JWT_SECRET must be set in env and be at least 16 characters long',
    );
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(configService),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('User no longer active');
    }
    return user;
  }
}
