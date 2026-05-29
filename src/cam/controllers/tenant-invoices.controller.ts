import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PortfolioAccessGuard } from '../../auth/guards/portfolio-access.guard';
import {
  CreateReminderDto,
  DeleteReminderDto,
  RecordPaymentDto,
} from '../dto/invoice-actions.dto';
import {
  TenantInvoiceKind,
  VarianceTag,
} from '../schemas/tenant-invoice.schema';
import { TenantInvoicesService } from '../services/tenant-invoices.service';
import { requireQuery } from '../utils/require-query';

@Controller('cam/invoices')
@UseGuards(PortfolioAccessGuard)
export class TenantInvoicesController {
  constructor(private readonly svc: TenantInvoicesService) {}

  /**
   * Story 20 — property ledger. Filters: timeline (year), property,
   * unit, vendor (deferred — needs denorm), category, variance, kind,
   * reconciled status.
   */
  @Get()
  list(
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('property_id') propertyId: string | undefined,
    @Query('unit_id') unitId: string | undefined,
    @Query('year') year: string | undefined,
    @Query('vendor_name') vendorName: string | undefined,
    @Query('expense_category') category: string | undefined,
    @Query('variance_tag') variance: VarianceTag | undefined,
    @Query('invoice_kind') kind: TenantInvoiceKind | undefined,
    @Query('reconciled') reconciled: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    return this.svc.list({
      portfolio_id: requireQuery(portfolioId, 'portfolio_id'),
      property_id: propertyId?.trim() || undefined,
      unit_id: unitId?.trim() || undefined,
      calendar_year: year ? Number(year) : undefined,
      vendor_name: vendorName?.trim() || undefined,
      expense_category: category?.trim() || undefined,
      variance_tag: variance,
      invoice_kind: kind,
      reconciled:
        reconciled === 'true' ? true : reconciled === 'false' ? false : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':invoiceId')
  getOne(
    @Param('invoiceId') invoiceId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    return this.svc.getOne(requireQuery(portfolioId, 'portfolio_id'), invoiceId);
  }

  /** Story 21 — record payment. Recomputes variance_tag (Story 22). */
  @Post(':invoiceId/payments')
  recordPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.svc.recordPayment(invoiceId, dto);
  }

  /** Story 27 — set reminder. */
  @Post(':invoiceId/reminders')
  addReminder(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateReminderDto,
  ) {
    return this.svc.addReminder(invoiceId, dto);
  }

  @Delete(':invoiceId/reminders/:reminderId')
  deleteReminder(
    @Param('invoiceId') invoiceId: string,
    @Param('reminderId') reminderId: string,
    @Body() dto: DeleteReminderDto,
  ) {
    return this.svc.deleteReminder(
      invoiceId,
      reminderId,
      dto.portfolio_id,
      dto.user_id,
    );
  }
}
