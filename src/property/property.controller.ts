import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { CreatePropertyFormDto } from './dto/create-property-form.dto';
import { GcsThumbnailService } from './gcs-thumbnail.service';
import { PropertyService } from './property.service';

const thumbnailInterceptor = FileInterceptor('thumbnail', {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly gcsThumbnail: GcsThumbnailService,
  ) {}

  @Get()
  listByPortfolio(@Query('portfolio_id') portfolioId: string | undefined) {
    const id = portfolioId?.trim();
    if (!id) {
      throw new BadRequestException('Query parameter portfolio_id is required');
    }
    return this.propertyService.listByPortfolioId(id);
  }

  @Get('asset/:objectPath(*)')
  async getAsset(
    @Param('objectPath') objectPath: string,
    @Res() res: Response,
  ) {
    const result = await this.gcsThumbnail.downloadFile(objectPath);
    if (!result) {
      throw new NotFoundException('Asset not found');
    }

    res.set({
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=31536000',
    });
    res.send(result.buffer);
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
