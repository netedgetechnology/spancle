"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChartOfAccountService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartOfAccountService = void 0;
const common_1 = require("@nestjs/common");
const chart_of_account_repository_1 = require("../repositories/chart-of-account.repository");
const SYSTEM_COA = [
    { code: '1000', name: 'Assets', type: 'asset', parentCode: null, isPostable: false },
    { code: '1100', name: 'Cash and Cash Equivalents', type: 'asset', parentCode: '1000', isPostable: false },
    { code: '1110', name: 'Cash (Till)', type: 'asset', parentCode: '1100', isPostable: true },
    { code: '1120', name: 'Bank Account (Primary)', type: 'asset', parentCode: '1100', isPostable: true },
    { code: '1130', name: 'Merchant Settlement Account', type: 'asset', parentCode: '1100', isPostable: true },
    { code: '1150', name: 'Accounts Receivable', type: 'asset', parentCode: '1000', isPostable: true },
    { code: '1160', name: 'Unbilled Receivable', type: 'asset', parentCode: '1000', isPostable: true,
        description: 'Revenue recognised before invoice is issued' },
    { code: '1170', name: 'Gateway Clearing', type: 'asset', parentCode: '1000', isPostable: true,
        description: 'In-transit gateway funds (Stripe / Razorpay settlement)' },
    { code: '1190', name: 'Chargebacks Receivable', type: 'asset', parentCode: '1000', isPostable: true,
        description: 'Outstanding chargeback recoveries' },
    { code: '2000', name: 'Liabilities', type: 'liability', parentCode: null, isPostable: false },
    { code: '2100', name: 'Accounts Payable', type: 'liability', parentCode: '2000', isPostable: true },
    { code: '2110', name: 'Deferred Revenue', type: 'liability', parentCode: '2000', isPostable: false },
    { code: '2120', name: 'Booking Deferred Revenue', type: 'liability', parentCode: '2110', isPostable: true },
    { code: '2130', name: 'Membership Deferred Revenue', type: 'liability', parentCode: '2110', isPostable: true },
    { code: '2140', name: 'Wallet Balance Liability', type: 'liability', parentCode: '2000', isPostable: true,
        description: 'Outstanding customer wallet balances' },
    { code: '2150', name: 'Tax Payable', type: 'liability', parentCode: '2000', isPostable: false },
    { code: '2160', name: 'GST / VAT Payable', type: 'liability', parentCode: '2150', isPostable: true },
    { code: '2170', name: 'Withholding Tax Payable', type: 'liability', parentCode: '2150', isPostable: true },
    { code: '2180', name: 'Refunds Payable', type: 'liability', parentCode: '2000', isPostable: true },
    { code: '2190', name: 'Chargebacks Payable', type: 'liability', parentCode: '2000', isPostable: true,
        description: 'Disputed amounts pending resolution' },
    { code: '3000', name: 'Equity', type: 'equity', parentCode: null, isPostable: false },
    { code: '3100', name: 'Retained Earnings', type: 'equity', parentCode: '3000', isPostable: true },
    { code: '4000', name: 'Revenue', type: 'revenue', parentCode: null, isPostable: false },
    { code: '4100', name: 'Booking Revenue', type: 'revenue', parentCode: '4000', isPostable: false },
    { code: '4110', name: 'Court Booking Revenue', type: 'revenue', parentCode: '4100', isPostable: true },
    { code: '4120', name: 'Coaching Revenue', type: 'revenue', parentCode: '4100', isPostable: true },
    { code: '4200', name: 'Membership Revenue', type: 'revenue', parentCode: '4000', isPostable: false },
    { code: '4210', name: 'Individual Membership', type: 'revenue', parentCode: '4200', isPostable: true },
    { code: '4220', name: 'Corporate Membership', type: 'revenue', parentCode: '4200', isPostable: true },
    { code: '4300', name: 'Academy Revenue', type: 'revenue', parentCode: '4000', isPostable: true },
    { code: '4400', name: 'Tournament Entry Revenue', type: 'revenue', parentCode: '4000', isPostable: true },
    { code: '4500', name: 'POS Revenue', type: 'revenue', parentCode: '4000', isPostable: false },
    { code: '4510', name: 'Merchandise Revenue', type: 'revenue', parentCode: '4500', isPostable: true },
    { code: '4520', name: 'Café Revenue', type: 'revenue', parentCode: '4500', isPostable: true },
    { code: '4600', name: 'Marketplace Revenue', type: 'revenue', parentCode: '4000', isPostable: true },
    { code: '4700', name: 'Platform Fees', type: 'revenue', parentCode: '4000', isPostable: true },
    { code: '4900', name: 'Other Income', type: 'revenue', parentCode: '4000', isPostable: false },
    { code: '4910', name: 'No-Show Penalty Income', type: 'revenue', parentCode: '4900', isPostable: true },
    { code: '4920', name: 'Late Cancellation Penalty', type: 'revenue', parentCode: '4900', isPostable: true },
    { code: '4930', name: 'Rounding Adjustment', type: 'revenue', parentCode: '4900', isPostable: true },
    { code: '5000', name: 'Expenses', type: 'expense', parentCode: null, isPostable: false },
    { code: '5100', name: 'Payment Processing Fees', type: 'expense', parentCode: '5000', isPostable: true },
    { code: '5200', name: 'Refunds Expense', type: 'expense', parentCode: '5000', isPostable: true },
    { code: '5210', name: 'Chargeback Expense', type: 'expense', parentCode: '5000', isPostable: true },
    { code: '5300', name: 'Discounts and Promotions', type: 'expense', parentCode: '5000', isPostable: true },
    { code: '5400', name: 'Write-offs and Bad Debt', type: 'expense', parentCode: '5000', isPostable: true },
];
let ChartOfAccountService = ChartOfAccountService_1 = class ChartOfAccountService {
    constructor(accountRepository) {
        this.accountRepository = accountRepository;
        this.logger = new common_1.Logger(ChartOfAccountService_1.name);
    }
    async seedSystemAccounts(tenantId) {
        const accounts = SYSTEM_COA.map((a) => ({
            tenantId,
            code: a.code,
            name: a.name,
            type: a.type,
            parentCode: a.parentCode,
            isPostable: a.isPostable,
            description: a.description ?? null,
            isSystem: true,
            isActive: true,
        }));
        await this.accountRepository.seedSystemAccounts(accounts);
        this.logger.log(`System Chart of Accounts seeded (${accounts.length} accounts) — tenant: ${tenantId}`);
    }
    async findAll(tenantId) {
        return this.accountRepository.findAll(tenantId);
    }
    async findByCode(code, tenantId) {
        return this.accountRepository.findByCodeOrFail(code, tenantId);
    }
    async findByType(type, tenantId) {
        return this.accountRepository.findByType(type, tenantId);
    }
    async deactivate(code, tenantId) {
        await this.accountRepository.deactivate(code, tenantId);
        this.logger.log(`Account ${code} deactivated — tenant: ${tenantId}`);
    }
};
exports.ChartOfAccountService = ChartOfAccountService;
exports.ChartOfAccountService = ChartOfAccountService = ChartOfAccountService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [chart_of_account_repository_1.ChartOfAccountRepository])
], ChartOfAccountService);
//# sourceMappingURL=chart-of-account.service.js.map