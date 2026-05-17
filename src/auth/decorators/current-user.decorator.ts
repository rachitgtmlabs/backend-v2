import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../../users/schemas/user.schema';

/**
 * Pulls the authenticated user (set by JwtStrategy.validate) off the request.
 * Returns the full Mongoose document; callers can read `._id`, `.email`, etc.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserDocument | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserDocument | undefined;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);

/**
 * Returns the authenticated user's id as a string, suitable for filtering
 * `created_by` fields on data models.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as { _id?: unknown } | undefined;
    return user?._id ? String(user._id) : undefined;
  },
);
