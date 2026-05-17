import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { Public } from '../auth/decorators/public.decorator';
import { PortfolioAccessGuard } from '../auth/guards/portfolio-access.guard';
import { CreatePropertyFormDto } from './dto/create-property-form.dto';
import { GcsThumbnailService } from './gcs-thumbnail.service';
import { PropertyService } from './property.service';

const THUMBNAIL_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_THUMBNAIL_MIME = /^image\/(png|jpe?g|webp|gif)$/i;

const thumbnailInterceptor = FileInterceptor('thumbnail', {
  storage: memoryStorage(),
  limits: { fileSize: THUMBNAIL_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !ALLOWED_THUMBNAIL_MIME.test(file.mimetype)) {
      cb(
        new BadRequestException(
          'Thumbnail must be a PNG, JPEG, WEBP, or GIF image',
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
});

const thumbnailValidationPipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({ fileType: ALLOWED_THUMBNAIL_MIME })
  .addMaxSizeValidator({ maxSize: THUMBNAIL_MAX_BYTES })
  .build({ fileIsRequired: false });

@Controller('properties')
@UseGuards(PortfolioAccessGuard)
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

  /**
   * Public — thumbnails are loaded via `<img src>` which can't carry an
   * Authorization header. GCS object paths are UUID-segmented (unguessable).
   * Consider migrating to signed URLs for stricter access control.
   */
  @Public()
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
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(result.buffer);
  }

  @Get(':propertyId/deletion-impact')
  deletionImpact(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException('Query parameter portfolio_id is required');
    }
    return this.propertyService.getDeletionImpact(pid, propertyId.trim());
  }

  @Delete(':propertyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException('Query parameter portfolio_id is required');
    }
    await this.propertyService.remove(pid, propertyId.trim());
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(thumbnailInterceptor)
  create(
    @Body() body: CreatePropertyFormDto,
    @UploadedFile(thumbnailValidationPipe)
    thumbnail: Express.Multer.File | undefined,
  ) {
    return this.propertyService.create(body, thumbnail);
  }
}
