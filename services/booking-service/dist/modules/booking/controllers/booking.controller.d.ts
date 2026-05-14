import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { BookingQueryDto } from '../dto/booking-query.dto';
import type { PaymentFailedDto } from '../dto/update-booking.dto';
import { CancelBookingDto as CancelDto, RescheduleBookingDto as RescheduleDto, CheckInDto as CheckInDtoClass, MarkNoShowDto as MarkNoShowDtoClass, WaiveNoShowDto as WaiveNoShowDtoClass } from '../dto/update-booking.dto';
/**
 * BookingController
 *
 * Route prefix: /api/v1/bookings
 * Guards: TenantGuard (every route) → RbacGuard (role-checked routes)
 * Audit: AuditInterceptor on every mutating method
 *
 * RBAC matrix:
 *   POST   /                        TENANT_ADMIN, TENANT_MANAGER, COACH, PLAYER
 *   GET    /                        TENANT_ADMIN, TENANT_MANAGER, COACH
 *   GET    /status-summary          TENANT_ADMIN, TENANT_MANAGER
 *   GET    /by-reference/:ref       TENANT_ADMIN, TENANT_MANAGER, COACH, PLAYER
 *   GET    /:id                     TENANT_ADMIN, TENANT_MANAGER, COACH, PLAYER
 *   GET    /:id/logs                TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id/confirm             TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id/cancel              TENANT_ADMIN, TENANT_MANAGER, PLAYER
 *   PATCH  /:id/reschedule          TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id/check-in            TENANT_ADMIN, TENANT_MANAGER, COACH
 *   PATCH  /:id/no-show             TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id/no-show/waive       TENANT_ADMIN
 *   PATCH  /:id/complete            TENANT_ADMIN, TENANT_MANAGER
 *   DELETE /:id                     TENANT_ADMIN
 */
export declare class BookingController {
    private readonly bookingService;
    constructor(bookingService: BookingService);
    create(dto: CreateBookingDto, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    findAll(query: BookingQueryDto, tenant: TenantContext): Promise<import("../entities/booking.entity").BookingEntity[]>;
    getStatusSummary(tenant: TenantContext): Promise<Record<import("../entities/booking.entity").BookingStatus, number>>;
    /** Declared before /:id to prevent route shadowing */
    findByReference(reference: string, tenant: TenantContext): Promise<import("../entities/booking.entity").BookingEntity>;
    findOne(id: string, tenant: TenantContext): Promise<import("../entities/booking.entity").BookingEntity>;
    confirm(id: string, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    cancel(id: string, dto: CancelDto, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    reschedule(id: string, dto: RescheduleDto, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    checkIn(id: string, dto: CheckInDtoClass, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    markNoShow(id: string, dto: MarkNoShowDtoClass, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    waiveNoShow(id: string, dto: WaiveNoShowDtoClass, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    /**
     * PATCH /bookings/:id/payment-failed
     * Called by payment gateway webhook or client when payment is declined/timed-out.
     * Transitions pending_payment → cancelled and releases reserved slots immediately.
     */
    paymentFailed(id: string, dto: PaymentFailedDto, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    complete(id: string, tenant: TenantContext, actor: BookingActorContext): Promise<import("../entities/booking.entity").BookingEntity>;
    remove(id: string, tenant: TenantContext, actor: BookingActorContext): Promise<void>;
}
//# sourceMappingURL=booking.controller.d.ts.map