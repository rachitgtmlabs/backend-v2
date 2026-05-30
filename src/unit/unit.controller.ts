import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PortfolioAccessGuard } from '../auth/guards/portfolio-access.guard';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitFormDto } from './dto/update-unit-form.dto';
import { UnitService } from './unit.service';

@Controller('units')
@UseGuards(PortfolioAccessGuard)
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  list(
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('property_id') propertyId: string | undefined,
  ) {
    const pf = requireQuery(portfolioId, 'portfolio_id');
    const pr = requireQuery(propertyId, 'property_id');
    return this.unitService.listByProperty(pf, pr);
  }

  /**
   * Extraction-time fuzzy match. Returns `matched: true` only when there's a
   * single clear winner; otherwise returns up to 3 candidates with scores so
   * the frontend can let the user pick.
   */
  @Get('match')
  match(
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('property_id') propertyId: string | undefined,
    @Query('hint') hint: string | undefined,
  ) {
    const pf = requireQuery(portfolioId, 'portfolio_id');
    const pr = requireQuery(propertyId, 'property_id');
    const h = (hint ?? '').trim();
    return this.unitService.findMatch(pf, pr, h);
  }

  @Get(':unitId')
  getOne(
    @Param('unitId') unitId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pf = requireQuery(portfolioId, 'portfolio_id');
    return this.unitService.getOne(pf, unitId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateUnitDto) {
    return this.unitService.create(body);
  }

  @Patch(':unitId')
  update(
    @Param('unitId') unitId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Body() body: UpdateUnitFormDto,
  ) {
    const pf = requireQuery(portfolioId, 'portfolio_id');
    return this.unitService.updateForm(unitId, pf, body);
  }

  @Delete(':unitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('unitId') unitId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pf = requireQuery(portfolioId, 'portfolio_id');
    await this.unitService.remove(pf, unitId);
  }
}

function requireQuery(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new BadRequestException(`Query parameter ${name} is required`);
  }
  return trimmed;
}
