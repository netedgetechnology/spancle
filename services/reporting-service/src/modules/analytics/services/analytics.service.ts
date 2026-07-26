import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import type {
  OccupancyQueryDto,
  CourtUtilizationQueryDto,
  PeakHourQueryDto,
  CancellationQueryDto,
  NoShowQueryDto,
  RevenueBySportQueryDto,
  RevenueByBranchQueryDto,
  BookingTrendsQueryDto,
  CustomerSummaryQueryDto,
  MembershipUsageQueryDto,
  ExportQueryDto,
} from '../dto/analytics.dto';

const MAX_RANGE_DAYS = 366;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  // ── Occupancy ──────────────────────────────────────────────────────────────

  async getOccupancy(query: OccupancyQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    return this.analyticsRepository.getOccupancy({
      tenantId,
      from:             query.from,
      to:               query.to,
      branchId:         query.branchId,
      courtId:          query.courtId,
      sportId:          query.sportId,
      granularity:      query.granularity ?? 'day',
      includeCancelled: query.includeCancelled ?? false,
    });
  }

  // ── Court utilisation ──────────────────────────────────────────────────────

  async getCourtUtilization(query: CourtUtilizationQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const rows = await this.analyticsRepository.getCourtUtilization({
      tenantId,
      from:      query.from,
      to:        query.to,
      branchId:  query.branchId,
      courtId:   query.courtId,
      sortBy:    query.sortBy ?? 'utilization',
      limit:     query.limit  ?? 50,
    });

    const totalRevenue   = rows.reduce((s, r) => s + r.totalRevenueMinor, 0);
    const totalBookings  = rows.reduce((s, r) => s + r.totalSlotsBooked, 0);
    const avgUtilization = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.utilizationPct, 0) / rows.length * 100) / 100
      : 0;

    return {
      from:               query.from,
      to:                 query.to,
      totalCourts:        rows.length,
      totalRevenueMinor:  totalRevenue,
      totalBookings,
      avgUtilizationPct:  avgUtilization,
      courts:             rows,
    };
  }

  // ── Peak hours ─────────────────────────────────────────────────────────────

  async getPeakHours(query: PeakHourQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const result = await this.analyticsRepository.getPeakHours({
      tenantId,
      from:       query.from,
      to:         query.to,
      branchId:   query.branchId,
      courtId:    query.courtId,
      sportId:    query.sportId,
      dayOfWeek:  query.dayOfWeek,
    });

    return {
      from:          query.from,
      to:            query.to,
      busiestHour:   result.busiestHour,
      busiestHourLabel: `${String(result.busiestHour).padStart(2, '0')}:00`,
      busiestDay:    result.busiestDay,
      quietestHour:  result.quietestHour,
      quietestHourLabel: `${String(result.quietestHour).padStart(2, '0')}:00`,
      byHour:        result.byHour,
      heatmap:       result.heatmap,
    };
  }

  // ── Cancellation analytics ─────────────────────────────────────────────────

  async getCancellationAnalytics(query: CancellationQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    return this.analyticsRepository.getCancellationAnalytics({
      tenantId,
      from:           query.from,
      to:             query.to,
      branchId:       query.branchId,
      courtId:        query.courtId,
      granularity:    query.granularity    ?? 'day',
      groupByReason:  query.groupByReason  ?? true,
    });
  }

  // ── No-show analytics ──────────────────────────────────────────────────────

  async getNoShowAnalytics(query: NoShowQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const result = await this.analyticsRepository.getNoShowAnalytics({
      tenantId,
      from:               query.from,
      to:                 query.to,
      branchId:           query.branchId,
      courtId:            query.courtId,
      granularity:        query.granularity       ?? 'day',
      riskThresholdPct:   query.riskThresholdPct  ?? 20,
    });

    return {
      ...result,
      highRiskCourts: result.byCourt.filter((c) => c.isHighRisk),
      riskThresholdPct: query.riskThresholdPct ?? 20,
    };
  }

  // ── Revenue by sport ───────────────────────────────────────────────────────

  async getRevenueBySport(query: RevenueBySportQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const rows = await this.analyticsRepository.getRevenueBySport({
      tenantId, from: query.from, to: query.to, branchId: query.branchId,
    });
    const totalRevenue  = rows.reduce((s, r) => s + r.totalRevenueMinor, 0);
    const totalBookings = rows.reduce((s, r) => s + r.totalBookings, 0);
    return { from: query.from, to: query.to, totalRevenueMinor: totalRevenue, totalBookings, bySport: rows };
  }

  // ── Revenue by branch ──────────────────────────────────────────────────────

  async getRevenueByBranch(query: RevenueByBranchQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const rows = await this.analyticsRepository.getRevenueByBranch({
      tenantId, from: query.from, to: query.to, sportId: query.sportId,
    });
    const totalRevenue  = rows.reduce((s, r) => s + r.totalRevenueMinor, 0);
    const totalBookings = rows.reduce((s, r) => s + r.totalBookings, 0);
    return { from: query.from, to: query.to, totalRevenueMinor: totalRevenue, totalBookings, byBranch: rows };
  }

  // ── Booking trends ─────────────────────────────────────────────────────────

  async getBookingTrends(query: BookingTrendsQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const rows = await this.analyticsRepository.getBookingTrends({
      tenantId,
      from:        query.from,
      to:          query.to,
      branchId:    query.branchId,
      sportId:     query.sportId,
      granularity: query.granularity ?? 'day',
    });
    const totalBookings = rows.reduce((s, r) => s + r.totalBookings, 0);
    const totalRevenue  = rows.reduce((s, r) => s + r.revenueMinor, 0);
    return { from: query.from, to: query.to, totalBookings, totalRevenueMinor: totalRevenue, byPeriod: rows };
  }

  // ── Customer booking summary ───────────────────────────────────────────────

  async getCustomerSummary(query: CustomerSummaryQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    return this.analyticsRepository.getCustomerBookingSummary({
      tenantId,
      from:      query.from,
      to:        query.to,
      branchId:  query.branchId,
      sportId:   query.sportId,
      limit:     query.limit  ?? 50,
      offset:    query.offset ?? 0,
    });
  }

  // ── Membership usage ───────────────────────────────────────────────────────

  async getMembershipUsage(query: MembershipUsageQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const rows = await this.analyticsRepository.getMembershipUsage({
      tenantId, from: query.from, to: query.to, branchId: query.branchId,
    });
    const totalDiscount = rows.reduce((s, r) => s + r.totalDiscountMinor, 0);
    const totalWallet   = rows.reduce((s, r) => s + r.totalWalletMinor, 0);
    return { from: query.from, to: query.to, totalDiscountMinor: totalDiscount, totalWalletMinor: totalWallet, byMembership: rows };
  }

  // ── Export (CSV / XLSX) ────────────────────────────────────────────────────

  async exportReport(query: ExportQueryDto, tenantId: string): Promise<{
    filename:    string;
    contentType: string;
    buffer:      Buffer;
  }> {
    this.validateRange(query.from, query.to);
    const { report, format, from, to } = query;

    // Fetch the appropriate dataset
    const data = await this.fetchExportData(report, query, tenantId);

    const filename   = `${report}-${from}-${to}.${format}`;
    const buffer     = format === 'csv'
      ? this.buildCsv(data)
      : this.buildXlsx(report, data);
    const contentType = format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return { filename, contentType, buffer };
  }

  private async fetchExportData(
    report: string, query: ExportQueryDto, tenantId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { from, to, branchId, sportId, courtId, granularity } = query;

    switch (report) {
      case 'occupancy': {
        const d = await this.analyticsRepository.getOccupancy({ tenantId, from, to, branchId, courtId, sportId, granularity: granularity ?? 'day', includeCancelled: false });
        return d.byPeriod as unknown as Array<Record<string, unknown>>;
      }
      case 'court-utilization': {
        const d = await this.analyticsRepository.getCourtUtilization({ tenantId, from, to, branchId, courtId, sortBy: 'utilization', limit: 200 });
        return d as unknown as Array<Record<string, unknown>>;
      }
      case 'peak-hours': {
        const d = await this.analyticsRepository.getPeakHours({ tenantId, from, to, branchId, courtId, sportId });
        return d.byHour as unknown as Array<Record<string, unknown>>;
      }
      case 'cancellations': {
        const d = await this.analyticsRepository.getCancellationAnalytics({ tenantId, from, to, branchId, courtId, granularity: granularity ?? 'day', groupByReason: true });
        return d.byPeriod as unknown as Array<Record<string, unknown>>;
      }
      case 'no-shows': {
        const d = await this.analyticsRepository.getNoShowAnalytics({ tenantId, from, to, branchId, courtId, granularity: granularity ?? 'day', riskThresholdPct: 20 });
        return d.byPeriod as unknown as Array<Record<string, unknown>>;
      }
      case 'revenue-by-sport': {
        const d = await this.analyticsRepository.getRevenueBySport({ tenantId, from, to, branchId });
        return d as unknown as Array<Record<string, unknown>>;
      }
      case 'revenue-by-branch': {
        const d = await this.analyticsRepository.getRevenueByBranch({ tenantId, from, to, sportId });
        return d as unknown as Array<Record<string, unknown>>;
      }
      case 'booking-trends': {
        const d = await this.analyticsRepository.getBookingTrends({ tenantId, from, to, branchId, sportId, granularity: granularity ?? 'day' });
        return d as unknown as Array<Record<string, unknown>>;
      }
      case 'customer-summary': {
        const d = await this.analyticsRepository.getCustomerBookingSummary({ tenantId, from, to, branchId, sportId, limit: 10_000, offset: 0 });
        return d.rows as unknown as Array<Record<string, unknown>>;
      }
      case 'membership-usage': {
        const d = await this.analyticsRepository.getMembershipUsage({ tenantId, from, to, branchId });
        return d as unknown as Array<Record<string, unknown>>;
      }
      default:
        return [];
    }
  }

  /**
   * buildCsv() — pure in-process CSV generation (no library required).
   * Escapes commas and double-quotes per RFC 4180.
   */
  private buildCsv(rows: Array<Record<string, unknown>>): Buffer {
    if (rows.length === 0) return Buffer.from('(no data)\n', 'utf-8');

    const headers = Object.keys(rows[0]!);
    const escape  = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
    ];
    return Buffer.from(lines.join('\r\n') + '\r\n', 'utf-8');
  }

  /**
   * buildXlsx() — minimal XLSX file without external dependencies.
   * Generates a valid Office Open XML SpreadsheetML workbook in-process.
   * Compatible with Excel, LibreOffice, and Google Sheets.
   */
  private buildXlsx(sheetName: string, rows: Array<Record<string, unknown>>): Buffer {
    const headers = rows.length > 0 ? Object.keys(rows[0]!) : [];

    const cellRef = (col: number, row: number): string => {
      let col26 = '';
      let c = col + 1;
      while (c > 0) { col26 = String.fromCharCode(65 + ((c - 1) % 26)) + col26; c = Math.floor((c - 1) / 26); }
      return `${col26}${row}`;
    };

    const cellXml = (value: unknown, ref: string): string => {
      if (value == null) return `<c r="${ref}"/>`;
      if (typeof value === 'number') return `<c r="${ref}" t="n"><v>${value}</v></c>`;
      const s = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return `<c r="${ref}" t="inlineStr"><is><t>${s}</t></is></c>`;
    };

    const headerRow = `<row r="1">${headers.map((h, ci) => cellXml(h, cellRef(ci, 1))).join('')}</row>`;
    const dataRows  = rows.map((row, ri) =>
      `<row r="${ri + 2}">${headers.map((h, ci) => cellXml(row[h], cellRef(ci, ri + 2))).join('')}</row>`,
    ).join('');

    const safeSheetName = sheetName.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${headerRow}${dataRows}</sheetData>
</worksheet>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
  Target="worksheets/sheet1.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml"  ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml"
  ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml"
  ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    // Minimal ZIP structure (stored, not deflated) — hand-crafted for zero dependencies
    const enc = (s: string): Buffer => Buffer.from(s, 'utf-8');
    const files: Array<{ name: string; data: Buffer }> = [
      { name: '[Content_Types].xml',       data: enc(contentTypesXml) },
      { name: '_rels/.rels',               data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
  Target="xl/workbook.xml"/>
</Relationships>`) },
      { name: 'xl/workbook.xml',           data: enc(workbookXml) },
      { name: 'xl/_rels/workbook.xml.rels',data: enc(relsXml) },
      { name: 'xl/worksheets/sheet1.xml',  data: enc(sheetXml) },
    ];

    return this.buildZip(files);
  }

  /** Minimal ZIP (Store compression, no deflate) for XLSX packaging. */
  private buildZip(files: Array<{ name: string; data: Buffer }>): Buffer {
    const parts: Buffer[] = [];
    const centralDir: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const nameB  = Buffer.from(file.name, 'utf-8');
      const crc32  = this.crc32(file.data);
      const size   = file.data.length;

      // Local file header
      const local  = Buffer.alloc(30 + nameB.length);
      local.writeUInt32LE(0x04034b50, 0);  // sig
      local.writeUInt16LE(20, 4);           // version
      local.writeUInt16LE(0, 6);            // flags
      local.writeUInt16LE(0, 8);            // compression (STORE)
      local.writeUInt16LE(0, 10);           // mod time
      local.writeUInt16LE(0, 12);           // mod date
      local.writeUInt32LE(crc32, 14);
      local.writeUInt32LE(size, 18);
      local.writeUInt32LE(size, 22);
      local.writeUInt16LE(nameB.length, 26);
      local.writeUInt16LE(0, 28);
      nameB.copy(local, 30);

      parts.push(local);
      parts.push(file.data);

      // Central directory entry
      const cd = Buffer.alloc(46 + nameB.length);
      cd.writeUInt32LE(0x02014b50, 0);   // sig
      cd.writeUInt16LE(20, 4);            // version made by
      cd.writeUInt16LE(20, 6);            // version needed
      cd.writeUInt16LE(0, 8);             // flags
      cd.writeUInt16LE(0, 10);            // compression
      cd.writeUInt16LE(0, 12);            // mod time
      cd.writeUInt16LE(0, 14);            // mod date
      cd.writeUInt32LE(crc32, 16);
      cd.writeUInt32LE(size, 20);
      cd.writeUInt32LE(size, 24);
      cd.writeUInt16LE(nameB.length, 28);
      cd.writeUInt16LE(0, 30);            // extra
      cd.writeUInt16LE(0, 32);            // comment
      cd.writeUInt16LE(0, 34);            // disk start
      cd.writeUInt16LE(0, 36);            // int attr
      cd.writeUInt32LE(0, 38);            // ext attr
      cd.writeUInt32LE(offset, 42);       // local header offset
      nameB.copy(cd, 46);
      centralDir.push(cd);

      offset += local.length + file.data.length;
    }

    const cdBuf = Buffer.concat(centralDir);
    const eocd  = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(cdBuf.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...parts, cdBuf, eocd]);
  }

  /** CRC-32 for ZIP entries (IEEE polynomial). */
  private crc32(buf: Buffer): number {
    const table = AnalyticsService._crc32Table;
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = table[((crc ^ buf[i]!) & 0xFF)]! ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  private static readonly _crc32Table: Uint32Array = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();

  // ── Private ────────────────────────────────────────────────────────────────

  private validateRange(from: string, to: string): void {
    if (from > to) {
      throw new BadRequestException(`from (${from}) must not be after to (${to})`);
    }
    const diffDays = Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000,
    );
    if (diffDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days (requested: ${diffDays})`,
      );
    }
  }
}
