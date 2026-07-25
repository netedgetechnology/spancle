import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 }    from '@nestjs/event-emitter';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerEvents }     from '../events/customer.events';
import type { CustomerEntity } from '../entities/customer.entity';
import type { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from '../dto/customer.dto';
import type { CustomerListResult, CustomerProfile } from '../repositories/customer.repository';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly eventEmitter:       EventEmitter2,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(dto: CreateCustomerDto, tenantId: string, actorId?: string): Promise<CustomerEntity> {
    if (dto.email) {
      const existing = await this.customerRepository.findByEmailAndTenant(dto.email, tenantId);
      if (existing) {
        throw new BadRequestException(
          `A customer with email ${dto.email} already exists in this tenant`,
        );
      }
    }

    const fullName = `${dto.firstName.trim()} ${dto.lastName.trim()}`;

    const entity = await this.customerRepository.create({
      tenantId,
      branchId:         dto.branchId          ?? null,
      userId:           dto.userId            ?? null,
      parentCustomerId: dto.parentCustomerId  ?? null,
      firstName:        dto.firstName.trim(),
      lastName:         dto.lastName.trim(),
      fullName,
      gender:           dto.gender            ?? null,
      dateOfBirth:      dto.dateOfBirth       ?? null,
      phone:            dto.phone             ?? null,
      email:            dto.email             ?? null,
      emergencyContact: dto.emergencyContact  ?? null,
      address:          dto.address           ?? null,
      profilePhoto:     dto.profilePhoto      ?? null,
      notes:            dto.notes             ?? null,
      isGuest:          dto.isGuest           ?? false,
      status:           'active',
      walletBalanceMinor: 0,
    });

    await this.eventEmitter.emitAsync(CustomerEvents.CREATED, {
      tenantId, customerId: entity.id, actorId, timestamp: new Date().toISOString(),
    });

    this.logger.log(`Customer created — id=${entity.id} tenant=${tenantId}`);
    return entity;
  }

  async findAll(tenantId: string, query: CustomerQueryDto): Promise<CustomerListResult> {
    return this.customerRepository.search(tenantId, query);
  }

  async findOne(id: string, tenantId: string): Promise<CustomerEntity> {
    const entity = await this.customerRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException(`Customer ${id} not found`);
    return entity;
  }

  async update(
    id:       string,
    dto:      UpdateCustomerDto,
    tenantId: string,
    actorId?: string,
  ): Promise<CustomerEntity> {
    const existing = await this.findOne(id, tenantId);

    const updates: Partial<CustomerEntity> = { ...(dto as Partial<CustomerEntity>) };

    // Re-compute fullName if either name part changed
    const firstName = dto.firstName ?? existing.firstName;
    const lastName  = dto.lastName  ?? existing.lastName;
    if (dto.firstName || dto.lastName) {
      updates.fullName = `${firstName.trim()} ${lastName.trim()}`;
    }

    // Email uniqueness check on change
    if (dto.email && dto.email !== existing.email) {
      const clash = await this.customerRepository.findByEmailAndTenant(dto.email, tenantId);
      if (clash && clash.id !== id) {
        throw new BadRequestException(
          `Email ${dto.email} is already used by another customer`,
        );
      }
    }

    const updated = await this.customerRepository.update(id, tenantId, updates);

    if (dto.status && dto.status !== existing.status) {
      await this.eventEmitter.emitAsync(CustomerEvents.STATUS_CHANGED, {
        tenantId, customerId: id, actorId,
        previousStatus: existing.status, newStatus: dto.status,
        timestamp: new Date().toISOString(),
      });
    } else {
      await this.eventEmitter.emitAsync(CustomerEvents.UPDATED, {
        tenantId, customerId: id, actorId, timestamp: new Date().toISOString(),
      });
    }

    return updated;
  }

  async remove(id: string, tenantId: string, actorId?: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.customerRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(CustomerEvents.DELETED, {
      tenantId, customerId: id, actorId, timestamp: new Date().toISOString(),
    });
    this.logger.log(`Customer soft-deleted — id=${id} tenant=${tenantId}`);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async getProfile(id: string, tenantId: string): Promise<CustomerProfile> {
    const profile = await this.customerRepository.getProfile(id, tenantId);
    if (!profile) throw new NotFoundException(`Customer ${id} not found`);
    return profile;
  }

  // ── Booking integration helpers ───────────────────────────────────────────

  /**
   * resolveOrCreateForBooking()
   *
   * Called by BookingService during booking creation.
   * Resolution order:
   *   1. If customer.userId provided → look up by userId
   *   2. If customer.email provided  → look up by email
   *   3. Neither found               → create new customer
   *      (isGuest=true when booking channel is online/guest without userId)
   *
   * Returns the customerId to stamp onto the booking row.
   * Never throws — returns null on any failure so booking creation is not blocked.
   */
  async resolveOrCreateForBooking(params: {
    tenantId:    string;
    userId?:     string | null;
    email?:      string;
    name:        string;
    phone?:      string | null;
    isMember?:   boolean;
    isGuest:     boolean;
  }): Promise<string | null> {
    try {
      const { tenantId, userId, email, name, phone, isGuest } = params;

      // Try userId first (most specific)
      if (userId) {
        const byUser = await this.customerRepository.findByUserIdAndTenant(userId, tenantId);
        if (byUser) return byUser.id;
      }

      // Try email
      if (email) {
        const byEmail = await this.customerRepository.findByEmailAndTenant(email, tenantId);
        if (byEmail) return byEmail.id;
      }

      // Auto-create
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] ?? name.trim();
      const lastName  = nameParts.slice(1).join(' ') || '-';

      const created = await this.customerRepository.create({
        tenantId,
        userId:    userId ?? null,
        firstName,
        lastName,
        fullName:  name.trim(),
        email:     email ?? null,
        phone:     phone ?? null,
        isGuest,
        status:    'active',
        walletBalanceMinor: 0,
      });

      this.logger.log(`Auto-created customer — id=${created.id} isGuest=${isGuest} tenant=${tenantId}`);
      return created.id;
    } catch (err: unknown) {
      // Non-fatal — booking creation continues without a customerId
      this.logger.warn(
        `resolveOrCreateForBooking failed — booking will have null customerId: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }
}
