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
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { PortfolioService } from './portfolio.service';

@Controller('portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  findAll(@CurrentUserId() userId: string | undefined) {
    return this.portfolioService.findAll(userId);
  }

  @Get(':id/deletion-impact')
  deletionImpact(
    @Param('id') id: string,
    @CurrentUserId() userId: string | undefined,
  ) {
    return this.portfolioService.getDeletionImpact(id, userId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUserId() userId: string | undefined,
  ) {
    return this.portfolioService.findOne(id, userId);
  }

  @Post()
  create(
    @Body() body: CreatePortfolioDto,
    @CurrentUserId() userId: string | undefined,
  ) {
    return this.portfolioService.create(body, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: CreatePortfolioDto,
    @CurrentUserId() userId: string | undefined,
  ) {
    return this.portfolioService.update(id, body, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUserId() userId: string | undefined,
  ) {
    return this.portfolioService.remove(id, userId);
  }
}
