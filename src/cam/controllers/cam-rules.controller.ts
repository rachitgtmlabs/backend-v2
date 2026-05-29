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
import { CreateCamRuleDto, UpdateCamRuleDto } from '../dto/cam-rule.dto';
import { CamRulesService } from '../services/cam-rules.service';
import { requireQuery } from '../utils/require-query';

@Controller('cam/rules')
@UseGuards(PortfolioAccessGuard)
export class CamRulesController {
  constructor(private readonly svc: CamRulesService) {}

  /** List all rules in the portfolio. Used by the unit form's rule picker. */
  @Get()
  list(@Query('portfolio_id') portfolioId: string | undefined) {
    return this.svc.listForPortfolio(requireQuery(portfolioId, 'portfolio_id'));
  }

  /**
   * Lookup by code. Used by the form's "type rule code + Enter" path so the
   * client can avoid pulling the full list first.
   */
  @Get('by-code/:ruleCode')
  getByCode(
    @Param('ruleCode') ruleCode: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    return this.svc.findByCode(
      requireQuery(portfolioId, 'portfolio_id'),
      ruleCode,
    );
  }

  @Get(':ruleId')
  getOne(
    @Param('ruleId') ruleId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    return this.svc.getOne(
      requireQuery(portfolioId, 'portfolio_id'),
      ruleId,
    );
  }

  @Post()
  create(@Body() dto: CreateCamRuleDto) {
    return this.svc.create(dto);
  }

  @Patch(':ruleId')
  update(
    @Param('ruleId') ruleId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Body() dto: UpdateCamRuleDto,
  ) {
    return this.svc.update(
      requireQuery(portfolioId, 'portfolio_id'),
      ruleId,
      dto,
    );
  }

  @Delete(':ruleId')
  delete(
    @Param('ruleId') ruleId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    return this.svc.remove(
      requireQuery(portfolioId, 'portfolio_id'),
      ruleId,
    );
  }
}
