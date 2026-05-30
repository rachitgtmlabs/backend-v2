import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as publicly accessible (skips the global JwtAuthGuard).
 * Use only for auth/login, public assets, and explicit health checks.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
