import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AmendmentAnalysisService, PreviousAnalysis } from './amendment-analysis.service';

interface AmendmentAnalysisRequestBody {
  lease_id: string;
  previous_analysis: string; // JSON stringified PreviousAnalysis
}

@Controller('amendment-analysis')
export class AmendmentAnalysisController {
  private readonly logger = new Logger(AmendmentAnalysisController.name);

  constructor(private readonly amendmentAnalysisService: AmendmentAnalysisService) {}

  @Post('stream')
  @UseInterceptors(FileInterceptor('assets'))
  async streamAmendmentAnalysis(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: AmendmentAnalysisRequestBody,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const bytes = file?.size ?? file?.buffer?.length ?? 0;
    this.logger.log(`amendment-analysis stream request bytes=${bytes} lease_id=${body.lease_id}`);

    if (!file?.buffer && !file?.path) {
      throw new BadRequestException(
        'Multipart field "assets" with a file is required',
      );
    }

    if (!body.lease_id) {
      throw new BadRequestException('lease_id is required');
    }

    let previousAnalysis: PreviousAnalysis = {};
    if (body.previous_analysis) {
      try {
        previousAnalysis = JSON.parse(body.previous_analysis);
      } catch (err) {
        throw new BadRequestException(
          'previous_analysis must be valid JSON',
        );
      }
    }

    await this.amendmentAnalysisService.streamNdjsonAmendmentAnalysis(
      file,
      previousAnalysis,
      res,
    );
  }
}
