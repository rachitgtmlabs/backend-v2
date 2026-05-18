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
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { PortfolioService } from './portfolio.service';

@Controller('portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  findAll() {
    return this.portfolioService.findAll();
  }

  @Get(':id/deletion-impact')
  deletionImpact(@Param('id') id: string) {
    return this.portfolioService.getDeletionImpact(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.portfolioService.findOne(id);
  }

  @Post()
  create(@Body() body: CreatePortfolioDto) {
    return this.portfolioService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: CreatePortfolioDto) {
    return this.portfolioService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.portfolioService.remove(id);
  }
}
