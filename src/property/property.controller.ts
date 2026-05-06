import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { CreatePropertyFormDto } from './dto/create-property-form.dto';
import { PropertyService } from './property.service';

const thumbnailInterceptor = FileInterceptor('thumbnail', {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  listByPortfolio(@Query('portfolio_id') portfolioId: string | undefined) {
    const id = portfolioId?.trim();
    if (!id) {
      throw new BadRequestException('Query parameter portfolio_id is required');
    }
    return this.propertyService.listByPortfolioId(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(thumbnailInterceptor)
  create(
    @Body() body: CreatePropertyFormDto,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.propertyService.create(body, thumbnail);
  }
}
