"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CamModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const unit_module_1 = require("../unit/unit.module");
const bills_controller_1 = require("./controllers/bills.controller");
const expense_categories_controller_1 = require("./controllers/expense-categories.controller");
const expense_report_controller_1 = require("./controllers/expense-report.controller");
const invoice_generation_controller_1 = require("./controllers/invoice-generation.controller");
const reconciliation_controller_1 = require("./controllers/reconciliation.controller");
const tenant_invoices_controller_1 = require("./controllers/tenant-invoices.controller");
const bill_schema_1 = require("./schemas/bill.schema");
const expense_category_schema_1 = require("./schemas/expense-category.schema");
const reconciliation_run_schema_1 = require("./schemas/reconciliation-run.schema");
const tenant_invoice_schema_1 = require("./schemas/tenant-invoice.schema");
const unit_threshold_schema_1 = require("./schemas/unit-threshold.schema");
const bills_service_1 = require("./services/bills.service");
const expense_categories_service_1 = require("./services/expense-categories.service");
const expense_report_service_1 = require("./services/expense-report.service");
const invoice_generation_service_1 = require("./services/invoice-generation.service");
const reconciliation_service_1 = require("./services/reconciliation.service");
const tenant_invoices_service_1 = require("./services/tenant-invoices.service");
let CamModule = class CamModule {
};
exports.CamModule = CamModule;
exports.CamModule = CamModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: expense_category_schema_1.ExpenseCategory.name, schema: expense_category_schema_1.ExpenseCategorySchema },
                { name: bill_schema_1.Bill.name, schema: bill_schema_1.BillSchema },
                { name: tenant_invoice_schema_1.TenantInvoice.name, schema: tenant_invoice_schema_1.TenantInvoiceSchema },
                { name: unit_threshold_schema_1.UnitThreshold.name, schema: unit_threshold_schema_1.UnitThresholdSchema },
                { name: reconciliation_run_schema_1.ReconciliationRun.name, schema: reconciliation_run_schema_1.ReconciliationRunSchema },
            ]),
            unit_module_1.UnitModule,
        ],
        controllers: [
            expense_categories_controller_1.ExpenseCategoriesController,
            bills_controller_1.BillsController,
            invoice_generation_controller_1.InvoiceGenerationController,
            tenant_invoices_controller_1.TenantInvoicesController,
            reconciliation_controller_1.ReconciliationController,
            expense_report_controller_1.ExpenseReportController,
        ],
        providers: [
            expense_categories_service_1.ExpenseCategoriesService,
            bills_service_1.BillsService,
            invoice_generation_service_1.InvoiceGenerationService,
            tenant_invoices_service_1.TenantInvoicesService,
            reconciliation_service_1.ReconciliationService,
            expense_report_service_1.ExpenseReportService,
        ],
        exports: [
            mongoose_1.MongooseModule,
            expense_categories_service_1.ExpenseCategoriesService,
            bills_service_1.BillsService,
            invoice_generation_service_1.InvoiceGenerationService,
            tenant_invoices_service_1.TenantInvoicesService,
            reconciliation_service_1.ReconciliationService,
            expense_report_service_1.ExpenseReportService,
        ],
    })
], CamModule);
//# sourceMappingURL=cam.module.js.map