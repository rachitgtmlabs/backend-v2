import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { LeaseAnalysisService } from './lease-analysis.service';

@Controller('lease-analysis')
export class LeaseAnalysisController {
  private readonly logger = new Logger(LeaseAnalysisController.name);

  constructor(private readonly leaseAnalysisService: LeaseAnalysisService) {}

  @Post('stream')
  @UseInterceptors(FileInterceptor('assets'))
  async streamLeaseAnalysis(
    @UploadedFile() file: Express.Multer.File,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const bytes = file?.size ?? file?.buffer?.length ?? 0;
    // eslint-disable-next-line no-console -- route hit marker for operators
    console.log(
      `[LeaseAnalysisController] POST /v1/lease-analysis/stream multipart field=assets bytes=${bytes}`,
    );
    this.logger.log(`lease-analysis stream request bytes=${bytes}`);

    if (!file?.buffer && !file?.path) {
      throw new BadRequestException(
        'Multipart field "assets" with a file is required',
      );
    }

    await this.leaseAnalysisService.streamNdjsonLeaseAnalysis(file, res);
  }
}
