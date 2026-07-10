import { Injectable, Logger } from '@nestjs/common';
import { ChartOfAccountRepository }  from '../repositories/chart-of-account.repository';
import { ChartOfAccountEntity, type AccountType } from '../entities/chart-of-account.entity';

/**
 * Default system Chart of Accounts.
 * All entries have isSystem = true and cannot be deleted or have code/type changed.
 * Uses a placeholder tenantId that is replaced by the real tenantId at seeding time.
 */
const SYSTEM_COA: Array<{
  code: string;
  name: string;
  type: AccountType;
  parentCode: string | null;
  isPostable: boolean;
  description?: string;
}> = [
  // ── 1xxx Assets ──────────────────────────────────────────────────────────
  { code: '1000', name: 'Assets',                     type: 'asset',     parentCode: null,   isPostable: false },
  { code: '1100', name: 'Cash and Cash Equivalents',  type: 'asset',     parentCode: '1000', isPostable: false },
  { code: '1110', name: 'Cash (Till)',                 type: 'asset',     parentCode: '1100', isPostable: true  },
  { code: '1120', name: 'Bank Account (Primary)',      type: 'asset',     parentCode: '1100', isPostable: true  },
  { code: '1130', name: 'Merchant Settlement Account',type: 'asset',     parentCode: '1100', isPostable: true  },
  { code: '1150', name: 'Accounts Receivable',        type: 'asset',     parentCode: '1000', isPostable: true  },
  { code: '1160', name: 'Unbilled Receivable',        type: 'asset',     parentCode: '1000', isPostable: true,
    description: 'Revenue recognised before invoice is issued' },
  { code: '1170', name: 'Gateway Clearing',           type: 'asset',     parentCode: '1000', isPostable: true,
    description: 'In-transit gateway funds (Stripe / Razorpay settlement)' },
  { code: '1190', name: 'Chargebacks Receivable',     type: 'asset',     parentCode: '1000', isPostable: true,
    description: 'Outstanding chargeback recoveries' },

  // ── 2xxx Liabilities ──────────────────────────────────────────────────────
  { code: '2000', name: 'Liabilities',                type: 'liability', parentCode: null,   isPostable: false },
  { code: '2100', name: 'Accounts Payable',           type: 'liability', parentCode: '2000', isPostable: true  },
  { code: '2110', name: 'Deferred Revenue',           type: 'liability', parentCode: '2000', isPostable: false },
  { code: '2120', name: 'Booking Deferred Revenue',   type: 'liability', parentCode: '2110', isPostable: true  },
  { code: '2130', name: 'Membership Deferred Revenue',type: 'liability', parentCode: '2110', isPostable: true  },
  { code: '2140', name: 'Wallet Balance Liability',   type: 'liability', parentCode: '2000', isPostable: true,
    description: 'Outstanding customer wallet balances' },
  { code: '2150', name: 'Tax Payable',                type: 'liability', parentCode: '2000', isPostable: false },
  { code: '2160', name: 'GST / VAT Payable',          type: 'liability', parentCode: '2150', isPostable: true  },
  { code: '2170', name: 'Withholding Tax Payable',    type: 'liability', parentCode: '2150', isPostable: true  },
  { code: '2180', name: 'Refunds Payable',            type: 'liability', parentCode: '2000', isPostable: true  },
  { code: '2190', name: 'Chargebacks Payable',        type: 'liability', parentCode: '2000', isPostable: true,
    description: 'Disputed amounts pending resolution' },

  // ── 3xxx Equity ───────────────────────────────────────────────────────────
  { code: '3000', name: 'Equity',                     type: 'equity',    parentCode: null,   isPostable: false },
  { code: '3100', name: 'Retained Earnings',          type: 'equity',    parentCode: '3000', isPostable: true  },

  // ── 4xxx Revenue ──────────────────────────────────────────────────────────
  { code: '4000', name: 'Revenue',                    type: 'revenue',   parentCode: null,   isPostable: false },
  { code: '4100', name: 'Booking Revenue',            type: 'revenue',   parentCode: '4000', isPostable: false },
  { code: '4110', name: 'Court Booking Revenue',      type: 'revenue',   parentCode: '4100', isPostable: true  },
  { code: '4120', name: 'Coaching Revenue',           type: 'revenue',   parentCode: '4100', isPostable: true  },
  { code: '4200', name: 'Membership Revenue',         type: 'revenue',   parentCode: '4000', isPostable: false },
  { code: '4210', name: 'Individual Membership',      type: 'revenue',   parentCode: '4200', isPostable: true  },
  { code: '4220', name: 'Corporate Membership',       type: 'revenue',   parentCode: '4200', isPostable: true  },
  { code: '4300', name: 'Academy Revenue',            type: 'revenue',   parentCode: '4000', isPostable: true  },
  { code: '4400', name: 'Tournament Entry Revenue',   type: 'revenue',   parentCode: '4000', isPostable: true  },
  { code: '4500', name: 'POS Revenue',                type: 'revenue',   parentCode: '4000', isPostable: false },
  { code: '4510', name: 'Merchandise Revenue',        type: 'revenue',   parentCode: '4500', isPostable: true  },
  { code: '4520', name: 'Café Revenue',               type: 'revenue',   parentCode: '4500', isPostable: true  },
  { code: '4600', name: 'Marketplace Revenue',        type: 'revenue',   parentCode: '4000', isPostable: true  },
  { code: '4700', name: 'Platform Fees',              type: 'revenue',   parentCode: '4000', isPostable: true  },
  { code: '4900', name: 'Other Income',               type: 'revenue',   parentCode: '4000', isPostable: false },
  { code: '4910', name: 'No-Show Penalty Income',     type: 'revenue',   parentCode: '4900', isPostable: true  },
  { code: '4920', name: 'Late Cancellation Penalty',  type: 'revenue',   parentCode: '4900', isPostable: true  },
  { code: '4930', name: 'Rounding Adjustment',        type: 'revenue',   parentCode: '4900', isPostable: true  },

  // ── 5xxx Expenses ─────────────────────────────────────────────────────────
  { code: '5000', name: 'Expenses',                   type: 'expense',   parentCode: null,   isPostable: false },
  { code: '5100', name: 'Payment Processing Fees',    type: 'expense',   parentCode: '5000', isPostable: true  },
  { code: '5200', name: 'Refunds Expense',            type: 'expense',   parentCode: '5000', isPostable: true  },
  { code: '5210', name: 'Chargeback Expense',         type: 'expense',   parentCode: '5000', isPostable: true  },
  { code: '5300', name: 'Discounts and Promotions',   type: 'expense',   parentCode: '5000', isPostable: true  },
  { code: '5400', name: 'Write-offs and Bad Debt',    type: 'expense',   parentCode: '5000', isPostable: true  },
];

@Injectable()
export class ChartOfAccountService {
  private readonly logger = new Logger(ChartOfAccountService.name);

  constructor(private readonly accountRepository: ChartOfAccountRepository) {}

  /**
   * Seeds system accounts for a tenant.
   * Idempotent — skips accounts that already exist.
   * Called on FinanceModule init and on tenant creation.
   */
  async seedSystemAccounts(tenantId: string): Promise<void> {
    const accounts = SYSTEM_COA.map((a) => ({
      tenantId,
      code:        a.code,
      name:        a.name,
      type:        a.type,
      parentCode:  a.parentCode,
      isPostable:  a.isPostable,
      description: a.description ?? null,
      isSystem:    true,
      isActive:    true,
    }));

    await this.accountRepository.seedSystemAccounts(accounts);
    this.logger.log(
      `System Chart of Accounts seeded (${accounts.length} accounts) — tenant: ${tenantId}`,
    );
  }

  async findAll(tenantId: string): Promise<ChartOfAccountEntity[]> {
    return this.accountRepository.findAll(tenantId);
  }

  async findByCode(code: string, tenantId: string): Promise<ChartOfAccountEntity> {
    return this.accountRepository.findByCodeOrFail(code, tenantId);
  }

  async findByType(type: AccountType, tenantId: string): Promise<ChartOfAccountEntity[]> {
    return this.accountRepository.findByType(type, tenantId);
  }

  async deactivate(code: string, tenantId: string): Promise<void> {
    await this.accountRepository.deactivate(code, tenantId);
    this.logger.log(`Account ${code} deactivated — tenant: ${tenantId}`);
  }
}
