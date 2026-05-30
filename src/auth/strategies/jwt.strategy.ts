import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationsService } from '../../organizations/organizations.service';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  email?: string;
  sub: string;
  org?: string;
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
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
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
    let user = await this.usersService.findById(payload.sub);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('User no longer active');
    }
    // Defense in depth: if the token claims an org, it must still match the
    // user's current org. Rejects tokens minted before an org reassignment.
    if (payload.org && user.organization_id && payload.org !== user.organization_id) {
      throw new UnauthorizedException('Organization mismatch');
    }
    // Backfill organization_id for users created before the org system so that
    // existing sessions start working immediately without requiring a re-login.
    if (!user.organization_id && user.email) {
      try {
        const org = await this.organizationsService.resolveForEmail(user.email);
        const updated = await this.usersService.setOrgId(String(user._id), org.orgId);
        if (updated) user = updated;
      } catch (err) {
        this.logger.warn(
          `Could not backfill org for ${user.email}: ${(err as Error).message}`,
        );
      }
    }
    return user;
  }
}
