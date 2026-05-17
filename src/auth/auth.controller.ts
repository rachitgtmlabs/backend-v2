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
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() userData: RegisterDto) {
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
}
