import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { isSuperadminEmail } from '../superadmin.config';

/**
 * Restricts a route to superadmins. Runs after the global JwtAuthGuard, so
 * `req.user` is already populated by JwtStrategy.validate. Authorization is by
 * email allowlist (see superadmin.config.ts) — there is no role system.
 */
@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { email?: string } | undefined;
    if (!isSuperadminEmail(user?.email)) {
      throw new ForbiddenException('Superadmin access required');
    }
    return true;
  }
}
