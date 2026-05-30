import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CurrentOrgId,
  CurrentUserId,
} from '../auth/decorators/current-user.decorator';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { PortfolioService } from './portfolio.service';

@Controller('portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  findAll(@CurrentOrgId() orgId: string | undefined) {
    return this.portfolioService.findAll(orgId);
  }

  @Get(':id/deletion-impact')
  deletionImpact(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string | undefined,
  ) {
    return this.portfolioService.getDeletionImpact(id, orgId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string | undefined,
  ) {
    return this.portfolioService.findOne(id, orgId);
  }

  @Post()
  create(
    @Body() body: CreatePortfolioDto,
    @CurrentUserId() userId: string | undefined,
    @CurrentOrgId() orgId: string | undefined,
  ) {
    return this.portfolioService.create(body, userId, orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: CreatePortfolioDto,
    @CurrentOrgId() orgId: string | undefined,
  ) {
    return this.portfolioService.update(id, body, orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string | undefined,
  ) {
    return this.portfolioService.remove(id, orgId);
  }
}
