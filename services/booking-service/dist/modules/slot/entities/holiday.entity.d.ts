/**
 * Holiday source:
 *   system   — pre-seeded by Spancle (UK bank holidays, etc.)
 *   tenant   — custom holidays added by the tenant admin
 */
export type HolidaySource = 'system' | 'tenant';
/**
 * HolidayEntity — a public holiday or custom closure date.
 *
 * Purpose:
 *   1. Trigger holiday pricing rules in PricingService
 *   2. Optionally skip slot generation on these dates (controlled per template)
 *   3. Surface in the admin calendar as highlighted dates
 *
 * Recurrence:
 *   - isRecurring = true: the holiday repeats every year on the same date
 *     (e.g. Christmas Day — Dec 25). The year in `date` is ignored.
 *   - isRecurring = false: one-off holiday on a specific date with year.
 *
 * System holidays:
 *   Seeded by HolidayService.seedSystemHolidays() for common locales.
 *   Tenants can override a system holiday by creating a tenant-scoped
 *   record with the same date and isActive=false (disables the system one).
 *
 * Table: holidays
 */
export declare class HolidayEntity {
    id: string;
    tenantId: string;
    /** Display name — e.g. "Christmas Day", "Spring Bank Holiday" */
    name: string;
    /**
     * The holiday date in ISO format: YYYY-MM-DD.
     * For recurring holidays, the year is ignored in matching.
     */
    date: string;
    /** If true, this holiday repeats every year on the same MM-DD */
    isRecurring: boolean;
    source: HolidaySource;
    /**
     * ISO 3166-1 alpha-2 country code — used to scope system holidays.
     * e.g. 'GB', 'US'. Null = applies to all countries.
     */
    countryCode: string | null;
    description: string | null;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=holiday.entity.d.ts.map