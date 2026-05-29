import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PortfolioAccessGuard } from '../../auth/guards/portfolio-access.guard';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { ExpenseCategoriesService } from '../services/expense-categories.service';
import { requireQuery } from '../utils/require-query';

@Controller('cam/categories')
@UseGuards(PortfolioAccessGuard)
export class ExpenseCategoriesController {
  constructor(private readonly svc: ExpenseCategoriesService) {}

  /**
   * Story 4 + 5 — list system + this portfolio's custom categories.
   * Used by: Bill review form, Reconcile rule editor, Category settings.
   */
  @Get()
  list(@Query('portfolio_id') portfolioId: string | undefined) {
    return this.svc.listForPortfolio(requireQuery(portfolioId, 'portfolio_id'));
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.createCustom(dto);
  }

  @Patch(':categoryId')
  update(
    @Param('categoryId') categoryId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.svc.updateCustom(
      requireQuery(portfolioId, 'portfolio_id'),
      categoryId,
      dto,
    );
  }

  @Delete(':categoryId')
  delete(
    @Param('categoryId') categoryId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    return this.svc.deleteCustom(
      requireQuery(portfolioId, 'portfolio_id'),
      categoryId,
    );
  }
}
