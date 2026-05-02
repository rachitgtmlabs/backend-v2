import { Body, Controller, Post } from '@nestjs/common';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { PortfolioService } from './portfolio.service';

@Controller('portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  create(@Body() body: CreatePortfolioDto) {
    return this.portfolioService.create(body);
  }
}
