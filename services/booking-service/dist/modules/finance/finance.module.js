"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const accounting_period_entity_1 = require("./entities/accounting-period.entity");
const chart_of_account_entity_1 = require("./entities/chart-of-account.entity");
const journal_entity_1 = require("./entities/journal.entity");
const tax_rate_entity_1 = require("./entities/tax-rate.entity");
const accounting_period_repository_1 = require("./repositories/accounting-period.repository");
const chart_of_account_repository_1 = require("./repositories/chart-of-account.repository");
const journal_repository_1 = require("./repositories/journal.repository");
const tax_rate_repository_1 = require("./repositories/tax-rate.repository");
const accounting_period_service_1 = require("./services/accounting-period.service");
const double_entry_service_1 = require("./services/double-entry.service");
const tax_resolver_service_1 = require("./services/tax-resolver.service");
const chart_of_account_service_1 = require("./services/chart-of-account.service");
const finance_admin_controller_1 = require("./controllers/finance-admin.controller");
let FinanceModule = class FinanceModule {
};
exports.FinanceModule = FinanceModule;
exports.FinanceModule = FinanceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                accounting_period_entity_1.AccountingPeriodEntity,
                chart_of_account_entity_1.ChartOfAccountEntity,
                journal_entity_1.JournalEntryEntity,
                journal_entity_1.JournalLineEntity,
                tax_rate_entity_1.TaxRateEntity,
            ]),
        ],
        controllers: [finance_admin_controller_1.FinanceAdminController],
        providers: [
            accounting_period_repository_1.AccountingPeriodRepository,
            chart_of_account_repository_1.ChartOfAccountRepository,
            journal_repository_1.JournalRepository,
            tax_rate_repository_1.TaxRateRepository,
            accounting_period_service_1.AccountingPeriodService,
            double_entry_service_1.DoubleEntryService,
            tax_resolver_service_1.TaxResolver,
            chart_of_account_service_1.ChartOfAccountService,
        ],
        exports: [
            accounting_period_service_1.AccountingPeriodService,
            double_entry_service_1.DoubleEntryService,
            tax_resolver_service_1.TaxResolver,
            chart_of_account_service_1.ChartOfAccountService,
            tax_rate_repository_1.TaxRateRepository,
            journal_repository_1.JournalRepository,
            chart_of_account_repository_1.ChartOfAccountRepository,
        ],
    })
], FinanceModule);
//# sourceMappingURL=finance.module.js.map