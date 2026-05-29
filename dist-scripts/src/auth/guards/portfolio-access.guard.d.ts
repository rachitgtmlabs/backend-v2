import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PortfolioService } from '../../portfolio/portfolio.service';
export declare class PortfolioAccessGuard implements CanActivate {
    private readonly portfolioService;
    constructor(portfolioService: PortfolioService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
