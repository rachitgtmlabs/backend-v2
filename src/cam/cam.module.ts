import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LeaseAnalysisModule } from '../lease-analysis/lease-analysis.module';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PropertyModule } from '../property/property.module';
import { UnitModule } from '../unit/unit.module';
import { BillsController } from './controllers/bills.controller';
import { CamRulesController } from './controllers/cam-rules.controller';
import { ExpenseCategoriesController } from './controllers/expense-categories.controller';
import { ExpenseReportController } from './controllers/expense-report.controller';
import { InvoiceGenerationController } from './controllers/invoice-generation.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { TenantInvoicesController } from './controllers/tenant-invoices.controller';
import { Bill, BillSchema } from './schemas/bill.schema';
import { CamRule, CamRuleSchema } from './schemas/cam-rule.schema';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from './schemas/expense-category.schema';
import {
  ReconciliationRun,
  ReconciliationRunSchema,
} from './schemas/reconciliation-run.schema';
import {
  TenantInvoice,
  TenantInvoiceSchema,
} from './schemas/tenant-invoice.schema';
import {
  UnitThreshold,
  UnitThresholdSchema,
} from './schemas/unit-threshold.schema';
import { BillsService } from './services/bills.service';
import { BillsUploadService } from './services/bills-upload.service';
import { CamRulesService } from './services/cam-rules.service';
import { ExpenseCategoriesService } from './services/expense-categories.service';
import { ExpenseReportService } from './services/expense-report.service';
import { InvoiceGenerationService } from './services/invoice-generation.service';
import { ReconciliationService } from './services/reconciliation.service';
import { TenantInvoicesService } from './services/tenant-invoices.service';

/**
 * CAM Reconciliation module.
 *
 * Schemas: ExpenseCategory, Bill, TenantInvoice, UnitThreshold,
 *          ReconciliationRun (Phase 1).
 * Services + controllers: Phase 3 — the full HTTP surface the frontend
 *          consumes for Stories 3–27 (minus OCR & cron, which are deferred).
 *
 * Pulls in UnitModule (re-exports MongooseModule) so we can read the
 * Unit/cam_allocation embedded sub-schema directly in the engine adapter.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
      { name: Bill.name, schema: BillSchema },
      { name: TenantInvoice.name, schema: TenantInvoiceSchema },
      { name: UnitThreshold.name, schema: UnitThresholdSchema },
      { name: ReconciliationRun.name, schema: ReconciliationRunSchema },
      { name: CamRule.name, schema: CamRuleSchema },
      // Read-only — used by TenantInvoicesService.hydrateWithBills() to
      // resolve tenant_name from the unit's latest processed lease so the
      // ledger UI shows the tenant entity instead of "—". Registered here
      // directly to avoid a circular import on LeaseModule.
      { name: Lease.name, schema: LeaseSchema },
    ]),
    UnitModule,
    PortfolioModule, // PortfolioAccessGuard depends on PortfolioService
    PropertyModule, // GcsThumbnailService for source-file uploads
    LeaseAnalysisModule, // OcrExtractionBridgeService for bill OCR
    OrganizationsModule, // CamEnabledGuard reads camReconciliationEnabled
  ],
  controllers: [
    ExpenseCategoriesController,
    BillsController,
    InvoiceGenerationController,
    TenantInvoicesController,
    ReconciliationController,
    ExpenseReportController,
    CamRulesController,
  ],
  providers: [
    ExpenseCategoriesService,
    BillsService,
    BillsUploadService,
    InvoiceGenerationService,
    TenantInvoicesService,
    ReconciliationService,
    ExpenseReportService,
    CamRulesService,
  ],
  exports: [
    MongooseModule,
    ExpenseCategoriesService,
    BillsService,
    InvoiceGenerationService,
    TenantInvoicesService,
    ReconciliationService,
    ExpenseReportService,
    CamRulesService,
  ],
})
export class CamModule {}
