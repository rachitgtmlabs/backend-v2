import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
import { PasswordCryptoService } from './password-crypto.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    UsersModule,
    OrganizationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 16) {
          throw new Error(
            'JWT_SECRET must be set in env and be at least 16 characters long',
          );
        }
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '7d';
        return {
          secret,
          // `expiresIn` accepts ms-formatted strings like '7d' / '1h'; the
          // upstream type is too narrow to express that as a generic string.
          signOptions: { expiresIn } as JwtModuleOptions['signOptions'],
        };
      },
    }),
  ],
  providers: [
    AuthService,
    PasskeyService,
    PasswordCryptoService,
    LocalStrategy,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
