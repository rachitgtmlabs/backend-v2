import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { PortfolioAccessGuard } from '../../auth/guards/portfolio-access.guard';
import {
  CreateBillDto,
  TransitionBillDto,
  UpdateBillDto,
} from '../dto/bill.dto';
import { BillStatus } from '../schemas/bill.schema';
import { BillsService } from '../services/bills.service';
import { BillsUploadService } from '../services/bills-upload.service';
import { requireQuery } from '../utils/require-query';

@Controller('cam/bills')
@UseGuards(PortfolioAccessGuard)
export class BillsController {
  constructor(
    private readonly svc: BillsService,
    private readonly upload: BillsUploadService,
  ) {}

  /** Story 7 (manual create — OCR pipeline calls this too once wired). */
  @Post()
  create(@Body() dto: CreateBillDto) {
    return this.svc.create(dto);
  }

  /**
   * Story 7+10 — upload a bill PDF/image. Runs OCR via the existing Document
   * AI bridge, asks Groq for structured fields against this portfolio's
   * expense categories, and persists a Bill row (status=`extracted` if all
   * compulsory fields came back, `incomplete` otherwise).
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadBill(
    @UploadedFile() file: Express.Multer.File,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('property_id') propertyId: string | undefined,
    @Query('session_id') sessionId: string | undefined,
  ) {
    if (!file) throw new BadRequestException('Multipart field "file" is required');
    return this.upload.uploadAndExtract({
      portfolio_id: requireQuery(portfolioId, 'portfolio_id'),
      property_id: requireQuery(propertyId, 'property_id'),
      session_id: sessionId?.trim() || undefined,
      file,
    });
  }

  /** Story 14 — bill review queue. Filterable by property, session, status. */
  @Get()
  list(
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('property_id') propertyId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('session_id') sessionId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ) {
    return this.svc.list({
      portfolio_id: requireQuery(portfolioId, 'portfolio_id'),
      property_id: propertyId?.trim() || undefined,
      status: status
        ? (status.split(',').map((s) => s.trim()) as BillStatus[])
        : undefined,
      session_id: sessionId?.trim() || undefined,
      invoice_date_from: from,
      invoice_date_to: to,
    });
  }

  /** Wizard kickoff — generate a fresh session id for the upload batch. */
  @Post('session')
  newSession() {
    return { session_id: this.svc.newSession() };
  }

  @Get(':billId')
  getOne(
    @Param('billId') billId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    return this.svc.getOne(requireQuery(portfolioId, 'portfolio_id'), billId);
  }

  /** Story 13 — fix missing-field bills. */
  @Patch(':billId')
  update(
    @Param('billId') billId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Body() dto: UpdateBillDto,
  ) {
    return this.svc.update(
      requireQuery(portfolioId, 'portfolio_id'),
      billId,
      dto,
    );
  }

  /** Story 14 — Accept / Reject. */
  @Post(':billId/transition')
  transition(
    @Param('billId') billId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Body() dto: TransitionBillDto,
  ) {
    return this.svc.transition(
      requireQuery(portfolioId, 'portfolio_id'),
      billId,
      dto,
    );
  }
}
