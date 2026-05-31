import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

/**
 * Authenticated user's own profile. The global JwtAuthGuard applies, so these
 * are always scoped to the caller — no id is taken from the path.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUserId() userId: string | undefined) {
    if (!userId) throw new UnauthorizedException();
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.toProfile(user);
  }

  @Patch('me')
  async updateMe(
    @CurrentUserId() userId: string | undefined,
    @Body() dto: UpdateProfileDto,
  ) {
    if (!userId) throw new UnauthorizedException();
    const user = await this.usersService.updateProfile(userId, dto);
    if (!user) throw new NotFoundException('User not found');
    return this.toProfile(user);
  }

  private toProfile(user: UserDocument) {
    return {
      id: String(user._id),
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      alert_email: user.alert_email ?? null,
      timezone: user.timezone ?? null,
      briefingEmailOptIn: user.briefingEmailOptIn ?? false,
      organization_id: user.organization_id ?? null,
    };
  }
}
