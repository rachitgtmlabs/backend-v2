import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PortfolioService } from '../../portfolio/portfolio.service';

/**
 * Validates that the authenticated user can access the portfolio_id supplied
 * in either the request query, body, or params. Skips when no portfolio_id is
 * present (some endpoints accept it as optional). Rejects with 403 otherwise.
 */
@Injectable()
export class PortfolioAccessGuard implements CanActivate {
  constructor(private readonly portfolioService: PortfolioService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { _id?: unknown } | undefined;
    const userId = user?._id ? String(user._id) : undefined;

    const portfolioId =
      readId(req.query?.portfolio_id) ??
      readId(req.body?.portfolio_id) ??
      readId(req.body?.portfolio?.id) ??
      readId(req.params?.id);

    if (!portfolioId) {
      // Endpoint chose not to require portfolio_id; let the handler decide.
      return true;
    }

    const allowed = await this.portfolioService.canUserAccess(
      portfolioId,
      userId,
    );
    if (!allowed) {
      throw new ForbiddenException('Portfolio not accessible by current user');
    }
    return true;
  }
}

function readId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
