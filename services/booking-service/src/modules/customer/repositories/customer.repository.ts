import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { InjectDataSource }  from '@nestjs/typeorm';
import type { Repository }   from 'typeorm';
import { DataSource }        from 'typeorm';
import { CustomerEntity }    from '../entities/customer.entity';
import type { CustomerQueryDto } from '../dto/customer.dto';

export interface CustomerListResult {
  data:  CustomerEntity[];
  total: number;
}

export interface CustomerProfile {
  customer:        CustomerEntity;
  familyMembers:   CustomerEntity[];
  bookingStats: {
    total:    number;
    active:   number;
    completed:number;
    cancelled:number;
    noShows:  number;
    totalSpendMinor: number;
    currency: string | null;
  };
  recentBookings: Array<{
    id:        string;
    reference: string;
    status:    string;
    startsAt:  Date;
    courtId:   string;
    finalPriceMinor: number | null;
  }>;
  membershipSummary: Array<{
    id:     string;
    planId: string;
    status: string;
    startsAt: Date | null;
    expiresAt: Date | null;
  }>;
}

@Injectable()
export class CustomerRepository {
  private readonly logger = new Logger(CustomerRepository.name);

  constructor(
    @InjectRepository(CustomerEntity)
    private readonly repo: Repository<CustomerEntity>,
    @InjectDataSource()
    private readonly ds: DataSource,
  ) {}

  async create(data: Partial<CustomerEntity>): Promise<CustomerEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<CustomerEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findByEmailAndTenant(email: string, tenantId: string): Promise<CustomerEntity | null> {
    return this.repo.findOne({
      where: { email: email.toLowerCase().trim(), tenantId, isDeleted: false },
    });
  }

  async findByUserIdAndTenant(userId: string, tenantId: string): Promise<CustomerEntity | null> {
    return this.repo.findOne({ where: { userId, tenantId, isDeleted: false } });
  }

  async update(id: string, tenantId: string, data: Partial<CustomerEntity>): Promise<CustomerEntity> {
    await this.repo.update({ id, tenantId }, data as object);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }

  /**
   * search()
   *
   * Partial-match search across fullName (ILIKE), email (ILIKE), phone (ILIKE).
   * Supports pagination and sorting. All queries are tenant-scoped.
   */
  async search(tenantId: string, query: CustomerQueryDto): Promise<CustomerListResult> {
    const limit      = query.limit      ?? 20;
    const offset     = query.offset     ?? 0;
    const sortBy     = query.sortBy     ?? 'fullName';
    const sortOrder  = query.sortOrder  ?? 'ASC';

    // Map sortBy to DB column names
    const SORT_COLS: Record<string, string> = {
      fullName:  'c.full_name',
      createdAt: 'c.created_at',
      email:     'c.email',
    };
    const orderCol = SORT_COLS[sortBy] ?? 'c.full_name';

    const params: unknown[] = [tenantId];
    const wheres: string[] = ['c.tenant_id = $1', 'c.is_deleted = FALSE'];

    if (query.q) {
      const like = `%${query.q.trim()}%`;
      params.push(like);
      wheres.push(`(c.full_name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }

    if (query.status) {
      params.push(query.status);
      wheres.push(`c.status = $${params.length}`);
    }

    if (query.branchId) {
      params.push(query.branchId);
      wheres.push(`c.branch_id = $${params.length}`);
    }

    if (query.isGuest !== undefined) {
      params.push(query.isGuest);
      wheres.push(`c.is_guest = $${params.length}`);
    }

    const where = wheres.join(' AND ');

    const [countRows, dataRows] = await Promise.all([
      this.ds.query<[{ count: string }]>(
        `SELECT COUNT(*)::int AS count FROM customers c WHERE ${where}`,
        params,
      ),
      this.ds.query<CustomerEntity[]>(
        `SELECT c.* FROM customers c WHERE ${where}
         ORDER BY ${orderCol} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
    ]);

    return {
      data:  dataRows,
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  /**
   * getProfile()
   *
   * Returns customer details, family members, booking stats, recent bookings,
   * and membership summary in a single coordinated set of queries.
   */
  async getProfile(id: string, tenantId: string): Promise<CustomerProfile | null> {
    const customer = await this.findByIdAndTenant(id, tenantId);
    if (!customer) return null;

    const [familyMembers, bookingStats, recentBookings, membershipSummary] = await Promise.all([
      // Family members
      this.repo.find({
        where: { parentCustomerId: id, tenantId, isDeleted: false },
        order: { firstName: 'ASC' },
      }),

      // Booking stats — single aggregation query
      this.ds.query<[{
        total: string; active: string; completed: string;
        cancelled: string; no_shows: string;
        total_spend: string; currency: string | null;
      }]>(`
        SELECT
          COUNT(*)                                                             AS total,
          COUNT(*) FILTER (WHERE status IN ('reserved','pending_payment','confirmed','checked_in','in_progress','rescheduled')) AS active,
          COUNT(*) FILTER (WHERE status = 'completed')                       AS completed,
          COUNT(*) FILTER (WHERE status IN ('cancelled','refunded'))          AS cancelled,
          COUNT(*) FILTER (WHERE status = 'no_show')                         AS no_shows,
          COALESCE(SUM(amount_paid_minor), 0)                                AS total_spend,
          MAX(currency)                                                       AS currency
        FROM bookings
        WHERE tenant_id = $1
          AND customer_id = $2
          AND is_deleted = FALSE
      `, [tenantId, id]),

      // Recent bookings (last 10)
      this.ds.query<Array<{
        id: string; reference: string; status: string;
        starts_at: Date; court_id: string; final_price_minor: number | null;
      }>>(`
        SELECT id, reference, status, starts_at, court_id, final_price_minor
        FROM bookings
        WHERE tenant_id = $1 AND customer_id = $2 AND is_deleted = FALSE
        ORDER BY starts_at DESC
        LIMIT 10
      `, [tenantId, id]),

      // Membership summary
      this.ds.query<Array<{
        id: string; plan_id: string; status: string;
        starts_at: Date | null; expires_at: Date | null;
      }>>(`
        SELECT id, plan_id, status, starts_at, expires_at
        FROM memberships
        WHERE tenant_id = $1 AND customer_id = $2 AND is_deleted = FALSE
        ORDER BY created_at DESC
        LIMIT 5
      `, [tenantId, id]),
    ]);

    const stats = bookingStats[0]!;
    return {
      customer,
      familyMembers,
      bookingStats: {
        total:           Number(stats.total),
        active:          Number(stats.active),
        completed:       Number(stats.completed),
        cancelled:       Number(stats.cancelled),
        noShows:         Number(stats.no_shows),
        totalSpendMinor: Number(stats.total_spend),
        currency:        stats.currency,
      },
      recentBookings: recentBookings.map((r) => ({
        id:              r.id,
        reference:       r.reference,
        status:          r.status,
        startsAt:        r.starts_at,
        courtId:         r.court_id,
        finalPriceMinor: r.final_price_minor,
      })),
      membershipSummary: membershipSummary.map((m) => ({
        id:        m.id,
        planId:    m.plan_id,
        status:    m.status,
        startsAt:  m.starts_at,
        expiresAt: m.expires_at,
      })),
    };
  }
}
