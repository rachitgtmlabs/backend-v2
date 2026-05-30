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
  previous_analysis: any; // Can be JSON string or object
  file_base64?: string;
  file_name?: string;
  file_mimetype?: string;
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
    let fileObj = file;

    // Support JSON requests with base64-encoded files to bypass HTTP/3 multipart bugs in Firefox/GFE
    if (!fileObj && body?.file_base64) {
      try {
        const buffer = Buffer.from(body.file_base64, 'base64');
        fileObj = {
          buffer,
          originalname: body.file_name || 'amendment.pdf',
          mimetype: body.file_mimetype || 'application/pdf',
          fieldname: 'assets',
          encoding: '7bit',
          size: buffer.length,
          stream: null as any,
          destination: '',
          filename: body.file_name || 'amendment.pdf',
          path: '',
        } as Express.Multer.File;
      } catch (err) {
        throw new BadRequestException('Invalid base64 payload for file_base64');
      }
    }

    const bytes = fileObj?.size ?? fileObj?.buffer?.length ?? 0;
    this.logger.log(`amendment-analysis stream request bytes=${bytes} lease_id=${body?.lease_id}`);

    if (!fileObj?.buffer && !fileObj?.path) {
      throw new BadRequestException(
        'Multipart field "assets" with a file (or JSON file_base64) is required',
      );
    }

    if (!body?.lease_id) {
      throw new BadRequestException('lease_id is required');
    }

    let previousAnalysis: PreviousAnalysis = {};
    if (body.previous_analysis) {
      if (typeof body.previous_analysis === 'string') {
        try {
          previousAnalysis = JSON.parse(body.previous_analysis);
        } catch (err) {
          throw new BadRequestException(
            'previous_analysis must be valid JSON',
          );
        }
      } else if (typeof body.previous_analysis === 'object') {
        previousAnalysis = body.previous_analysis;
      }
    }

    await this.amendmentAnalysisService.streamNdjsonAmendmentAnalysis(
      fileObj,
      previousAnalysis,
      res,
    );
  }
}
