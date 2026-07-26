/**
 * analytics.service.spec.ts
 *
 * Unit tests for AnalyticsService covering:
 *   ✓ getOccupancy          — delegates with tenantId
 *   ✓ getCourtUtilization   — aggregates totals, avgUtilization
 *   ✓ getPeakHours          — returns busiestHour label
 *   ✓ getCancellationAnalytics — delegates correctly
 *   ✓ getNoShowAnalytics    — filters highRiskCourts
 *   ✓ getRevenueBySport     — aggregates totalRevenue
 *   ✓ getRevenueByBranch    — aggregates totalRevenue
 *   ✓ getBookingTrends      — defaults granularity to 'day'
 *   ✓ getCustomerSummary    — delegates with limit/offset
 *   ✓ getMembershipUsage    — aggregates totalDiscount
 *   ✓ validateRange         — throws on from > to
 *   ✓ validateRange         — throws when range > 366 days
 *   ✓ exportReport (CSV)    — produces RFC 4180 CSV
 *   ✓ exportReport (XLSX)   — produces ZIP magic bytes
 *   ✓ tenant isolation      — tenantId passed to every repository call
 */

import { BadRequestException }  from '@nestjs/common';
import { AnalyticsService }     from '../services/analytics.service';
import type { AnalyticsRepository } from '../repositories/analytics.repository';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const T = 'tenant-0000-0000-0000-000000000001';

const BASE_RANGE = { from: '2025-01-01', to: '2025-01-31' };

const OCC_PERIOD = {
  period: '2025-01-01', totalSlots: 10, bookedSlots: 8,
  availableSlots: 2, reservedSlots: 0, completedSlots: 7,
  cancelledSlots: 1, utilizationPct: 80, revenueMinor: 5000,
};

const COURT_ROW = {
  courtId: 'c1', branchId: 'b1',
  totalSlotsGenerated: 100, totalSlotsBooked: 75, totalSlotsAvailable: 25,
  utilizationPct: 75, totalDurationMinsBooked: 4500, avgDurationMins: 60,
  totalRevenueMinor: 30000, bookingCount: 75, avgBookingValueMinor: 400,
};

const PEAK_ROW = {
  hourOfDay: 18, dayOfWeek: 5, dayName: 'Saturday',
  slotCount: 20, bookedCount: 18, utilizationPct: 90, revenueMinor: 9000,
};

// ── Mock repository ───────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<AnalyticsRepository> {
  return {
    getOccupancy: jest.fn().mockResolvedValue({
      from: BASE_RANGE.from, to: BASE_RANGE.to,
      totalSlots: 310, totalBooked: 248,
      overallUtilizationPct: 80, totalRevenueMinor: 155000,
      byPeriod: [OCC_PERIOD], byCourt: [],
    }),
    getCourtUtilization: jest.fn().mockResolvedValue([COURT_ROW, { ...COURT_ROW, courtId: 'c2', utilizationPct: 60, totalRevenueMinor: 20000, bookingCount: 50 }]),
    getPeakHours: jest.fn().mockResolvedValue({
      busiestHour: 18, busiestDay: 'Saturday', quietestHour: 7,
      byHour: [PEAK_ROW], heatmap: [PEAK_ROW],
    }),
    getCancellationAnalytics: jest.fn().mockResolvedValue({
      from: BASE_RANGE.from, to: BASE_RANGE.to,
      totalCancellations: 12, cancellationRate: 5.2,
      totalRevenueImpactMinor: 6000, avgCancellationLeadHours: 2.5,
      byPeriod: [], byReason: [], byCourt: [],
    }),
    getNoShowAnalytics: jest.fn().mockResolvedValue({
      from: BASE_RANGE.from, to: BASE_RANGE.to,
      totalBookings: 200, totalNoShows: 10, overallNoShowRate: 5,
      totalWaived: 2, revenueAtRiskMinor: 5000, avgNoShowLeadMins: 45,
      byPeriod: [], byCourt: [
        { courtId: 'c1', branchId: 'b1', totalBookings: 50, noShows: 15, noShowRate: 30, isHighRisk: true, revenueAtRiskMinor: 1500 },
        { courtId: 'c2', branchId: 'b1', totalBookings: 50, noShows: 5,  noShowRate: 10, isHighRisk: false, revenueAtRiskMinor: 500 },
      ],
      byDayOfWeek: [],
    }),
    getRevenueBySport: jest.fn().mockResolvedValue([
      { sportId: 's1', totalBookings: 80, totalRevenueMinor: 40000, avgRevenueMinor: 500, totalDurationMins: 4800, cancellationCount: 5, cancellationRate: 6.25 },
    ]),
    getRevenueByBranch: jest.fn().mockResolvedValue([
      { branchId: 'b1', totalBookings: 150, totalRevenueMinor: 75000, avgRevenueMinor: 500, totalDurationMins: 9000, cancellationCount: 10, noShowCount: 3, utilizationPct: 70 },
    ]),
    getBookingTrends: jest.fn().mockResolvedValue([
      { period: '2025-01-01', totalBookings: 15, confirmed: 12, cancelled: 2, noShows: 1, newCustomers: 3, revenueMinor: 7500, avgBookingMins: 60 },
    ]),
    getCustomerBookingSummary: jest.fn().mockResolvedValue({
      total: 2,
      rows: [
        { customerId: 'cust-1', customerName: 'Alice Smith', customerEmail: 'a@b.com', totalBookings: 10, confirmedBookings: 8, cancelledBookings: 1, noShows: 1, totalSpendMinor: 5000, avgBookingMins: 60, lastBookingDate: '2025-01-28' },
      ],
    }),
    getMembershipUsage: jest.fn().mockResolvedValue([
      { membershipId: 'm1', entitlementType: 'court_credit', bookingsWithCredit: 20, totalDiscountMinor: 10000, totalWalletMinor: 2000, avgDiscountMinor: 500, uniqueCustomers: 15 },
    ]),
  } as unknown as jest.Mocked<AnalyticsRepository>;
}

function makeSvc(repo = makeRepo()) {
  return new AnalyticsService(repo);
}

// ── Existing endpoints ────────────────────────────────────────────────────────

describe('AnalyticsService.getOccupancy()', () => {
  it('delegates to repository with tenantId', async () => {
    const repo = makeRepo(); const svc = makeSvc(repo);
    await svc.getOccupancy({ ...BASE_RANGE }, T);
    expect(repo.getOccupancy).toHaveBeenCalledWith(expect.objectContaining({ tenantId: T }));
  });
  it('uses "day" as default granularity', async () => {
    const repo = makeRepo(); const svc = makeSvc(repo);
    await svc.getOccupancy({ ...BASE_RANGE }, T);
    expect(repo.getOccupancy).toHaveBeenCalledWith(expect.objectContaining({ granularity: 'day' }));
  });
});

describe('AnalyticsService.getCourtUtilization()', () => {
  it('returns aggregated totals', async () => {
    const svc = makeSvc();
    const result = await svc.getCourtUtilization({ ...BASE_RANGE }, T);
    expect(result.totalRevenueMinor).toBe(50000);
    expect(result.totalBookings).toBe(150); // totalSlotsBooked: 75+75
    expect(result.avgUtilizationPct).toBe(67.5);
  });
});

describe('AnalyticsService.getPeakHours()', () => {
  it('returns busiestHourLabel', async () => {
    const svc = makeSvc();
    const result = await svc.getPeakHours({ ...BASE_RANGE }, T);
    expect(result.busiestHourLabel).toBe('18:00');
    expect(result.quietestHourLabel).toBe('07:00');
  });
});

describe('AnalyticsService.getNoShowAnalytics()', () => {
  it('filters highRiskCourts by riskThresholdPct', async () => {
    const svc = makeSvc();
    const result = await svc.getNoShowAnalytics({ ...BASE_RANGE, riskThresholdPct: 25 }, T);
    expect(result.highRiskCourts).toHaveLength(1);
    expect(result.highRiskCourts[0]!.courtId).toBe('c1');
  });
});

// ── New endpoints ─────────────────────────────────────────────────────────────

describe('AnalyticsService.getRevenueBySport()', () => {
  it('aggregates totalRevenueMinor and totalBookings', async () => {
    const svc = makeSvc();
    const result = await svc.getRevenueBySport({ ...BASE_RANGE }, T);
    expect(result.totalRevenueMinor).toBe(40000);
    expect(result.totalBookings).toBe(80);
    expect(result.bySport).toHaveLength(1);
  });

  it('passes tenantId and branchId to repository', async () => {
    const repo = makeRepo(); const svc = makeSvc(repo);
    await svc.getRevenueBySport({ ...BASE_RANGE, branchId: 'b1' }, T);
    expect(repo.getRevenueBySport).toHaveBeenCalledWith(expect.objectContaining({ tenantId: T, branchId: 'b1' }));
  });
});

describe('AnalyticsService.getRevenueByBranch()', () => {
  it('aggregates totalRevenueMinor', async () => {
    const svc = makeSvc();
    const result = await svc.getRevenueByBranch({ ...BASE_RANGE }, T);
    expect(result.totalRevenueMinor).toBe(75000);
    expect(result.byBranch).toHaveLength(1);
  });
});

describe('AnalyticsService.getBookingTrends()', () => {
  it('defaults granularity to day', async () => {
    const repo = makeRepo(); const svc = makeSvc(repo);
    await svc.getBookingTrends({ ...BASE_RANGE }, T);
    expect(repo.getBookingTrends).toHaveBeenCalledWith(expect.objectContaining({ granularity: 'day' }));
  });

  it('sums totalBookings and totalRevenueMinor', async () => {
    const svc = makeSvc();
    const result = await svc.getBookingTrends({ ...BASE_RANGE }, T);
    expect(result.totalBookings).toBe(15);
    expect(result.totalRevenueMinor).toBe(7500);
  });
});

describe('AnalyticsService.getCustomerSummary()', () => {
  it('passes limit/offset with defaults', async () => {
    const repo = makeRepo(); const svc = makeSvc(repo);
    await svc.getCustomerSummary({ ...BASE_RANGE }, T);
    expect(repo.getCustomerBookingSummary).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0, tenantId: T }),
    );
  });

  it('returns total + rows', async () => {
    const svc = makeSvc();
    const result = await svc.getCustomerSummary({ ...BASE_RANGE }, T);
    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(1);
  });
});

describe('AnalyticsService.getMembershipUsage()', () => {
  it('aggregates totalDiscountMinor and totalWalletMinor', async () => {
    const svc = makeSvc();
    const result = await svc.getMembershipUsage({ ...BASE_RANGE }, T);
    expect(result.totalDiscountMinor).toBe(10000);
    expect(result.totalWalletMinor).toBe(2000);
    expect(result.byMembership).toHaveLength(1);
  });
});

// ── Range validation ──────────────────────────────────────────────────────────

describe('AnalyticsService — validateRange()', () => {
  it('throws BadRequestException when from > to', async () => {
    const svc = makeSvc();
    await expect(
      svc.getOccupancy({ from: '2025-02-01', to: '2025-01-01' }, T),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when range > 366 days', async () => {
    const svc = makeSvc();
    await expect(
      svc.getOccupancy({ from: '2024-01-01', to: '2025-12-31' }, T),
    ).rejects.toThrow(BadRequestException);
  });
});

// ── Export ────────────────────────────────────────────────────────────────────

describe('AnalyticsService.exportReport()', () => {
  it('returns CSV buffer with correct headers', async () => {
    const svc = makeSvc();
    const result = await svc.exportReport(
      { ...BASE_RANGE, format: 'csv', report: 'booking-trends' },
      T,
    );
    expect(result.contentType).toBe('text/csv; charset=utf-8');
    expect(result.filename).toContain('.csv');
    const csv = result.buffer.toString('utf-8');
    expect(csv).toContain('period');
    expect(csv).toContain('totalBookings');
  });

  it('returns XLSX buffer starting with ZIP magic bytes (PK)', async () => {
    const svc = makeSvc();
    const result = await svc.exportReport(
      { ...BASE_RANGE, format: 'xlsx', report: 'revenue-by-sport' },
      T,
    );
    expect(result.contentType).toContain('spreadsheetml');
    expect(result.filename).toContain('.xlsx');
    // ZIP files start with PK (0x50 0x4B)
    expect(result.buffer[0]).toBe(0x50);
    expect(result.buffer[1]).toBe(0x4B);
  });

  it('throws BadRequestException on invalid range for export', async () => {
    const svc = makeSvc();
    await expect(
      svc.exportReport({ from: '2025-02-01', to: '2025-01-01', format: 'csv', report: 'occupancy' }, T),
    ).rejects.toThrow(BadRequestException);
  });
});

// ── Tenant isolation ──────────────────────────────────────────────────────────

describe('AnalyticsService — tenant isolation', () => {
  const OTHER = 'tenant-ffff-ffff-ffff-ffffffffffff';

  it('every report method passes tenantId to repository', async () => {
    const repo = makeRepo(); const svc = makeSvc(repo);

    await svc.getOccupancy({ ...BASE_RANGE }, OTHER);
    expect(repo.getOccupancy).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getCourtUtilization({ ...BASE_RANGE }, OTHER);
    expect(repo.getCourtUtilization).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getPeakHours({ ...BASE_RANGE }, OTHER);
    expect(repo.getPeakHours).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getCancellationAnalytics({ ...BASE_RANGE }, OTHER);
    expect(repo.getCancellationAnalytics).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getNoShowAnalytics({ ...BASE_RANGE }, OTHER);
    expect(repo.getNoShowAnalytics).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getRevenueBySport({ ...BASE_RANGE }, OTHER);
    expect(repo.getRevenueBySport).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getRevenueByBranch({ ...BASE_RANGE }, OTHER);
    expect(repo.getRevenueByBranch).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getBookingTrends({ ...BASE_RANGE }, OTHER);
    expect(repo.getBookingTrends).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getCustomerSummary({ ...BASE_RANGE }, OTHER);
    expect(repo.getCustomerBookingSummary).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));

    await svc.getMembershipUsage({ ...BASE_RANGE }, OTHER);
    expect(repo.getMembershipUsage).toHaveBeenCalledWith(expect.objectContaining({ tenantId: OTHER }));
  });
});
