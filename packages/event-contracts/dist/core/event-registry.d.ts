/**
 * EventRegistry — canonical list of all platform event channels.
 * Consumers subscribe to these. Producers publish to these.
 *
 * Single source of truth — prevents string typos in channel names.
 */
export declare const EventRegistry: {
    readonly IDENTITY_LOGIN_SUCCESS: "spancle.identity.login_success";
    readonly IDENTITY_LOGIN_FAILED: "spancle.identity.login_failed";
    readonly IDENTITY_LOGOUT: "spancle.identity.logout";
    readonly IDENTITY_PASSWORD_CHANGED: "spancle.identity.password_changed";
    readonly IDENTITY_PASSWORD_RESET: "spancle.identity.password_reset";
    readonly IDENTITY_ACCOUNT_LOCKED: "spancle.identity.account_locked";
    readonly IDENTITY_CREATED: "spancle.identity.created";
    readonly IDENTITY_DEACTIVATED: "spancle.identity.deactivated";
    readonly TENANT_CREATED: "spancle.tenant.created";
    readonly TENANT_UPDATED: "spancle.tenant.updated";
    readonly TENANT_ACTIVATED: "spancle.tenant.activated";
    readonly TENANT_SUSPENDED: "spancle.tenant.suspended";
    readonly TENANT_TERMINATED: "spancle.tenant.terminated";
    readonly TENANT_TIER_CHANGED: "spancle.tenant.tier_changed";
    readonly USER_CREATED: "spancle.user.created";
    readonly USER_UPDATED: "spancle.user.updated";
    readonly USER_DELETED: "spancle.user.deleted";
    readonly USER_ROLE_CHANGED: "spancle.user.role_changed";
    readonly BOOKING_CREATED: "spancle.booking.created";
    readonly BOOKING_CONFIRMED: "spancle.booking.confirmed";
    readonly BOOKING_CANCELLED: "spancle.booking.cancelled";
    readonly BOOKING_COMPLETED: "spancle.booking.completed";
    readonly BOOKING_NO_SHOW: "spancle.booking.no_show";
    readonly BOOKING_RESCHEDULED: "spancle.booking.rescheduled";
    readonly BOOKING_EXPIRED: "spancle.booking.expired";
    readonly BOOKING_REMINDER_24H: "spancle.booking.reminder_24h";
    readonly BOOKING_REMINDER_2H: "spancle.booking.reminder_2h";
    readonly WAITLIST_PROMOTED: "spancle.waitlist.promoted";
    readonly MEMBERSHIP_EXPIRY_REMINDER: "spancle.membership.expiry_reminder";
    readonly INVOICE_CREATED: "spancle.invoice.created";
    readonly INVOICE_PAID: "spancle.invoice.paid";
    readonly INVOICE_OVERDUE: "spancle.invoice.overdue";
    readonly INVOICE_VOIDED: "spancle.invoice.voided";
    readonly PAYMENT_SUCCEEDED: "spancle.payment.succeeded";
    readonly PAYMENT_FAILED: "spancle.payment.failed";
    readonly PAYMENT_REFUNDED: "spancle.payment.refunded";
    readonly WALLET_CREDITED: "spancle.wallet.credited";
    readonly WALLET_DEBITED: "spancle.wallet.debited";
    readonly TOURNAMENT_CREATED: "spancle.tournament.created";
    readonly TOURNAMENT_STARTED: "spancle.tournament.started";
    readonly TOURNAMENT_COMPLETED: "spancle.tournament.completed";
    readonly TOURNAMENT_CANCELLED: "spancle.tournament.cancelled";
    readonly MATCH_SCHEDULED: "spancle.match.scheduled";
    readonly MATCH_STARTED: "spancle.match.started";
    readonly MATCH_COMPLETED: "spancle.match.completed";
    readonly MATCH_SCORE_UPDATED: "spancle.match.score_updated";
    readonly PLAYER_REGISTERED: "spancle.player.registered";
    readonly PLAYER_ACTIVATED: "spancle.player.activated";
    readonly PLAYER_SUSPENDED: "spancle.player.suspended";
    readonly PLAYER_LEVEL_CHANGED: "spancle.player.level_changed";
    readonly COACH_ASSIGNED: "spancle.coach.assigned";
    readonly NOTIFICATION_QUEUED: "spancle.notification.queued";
    readonly NOTIFICATION_SENT: "spancle.notification.sent";
    readonly NOTIFICATION_FAILED: "spancle.notification.failed";
    readonly REPORT_REQUESTED: "spancle.report.requested";
    readonly REPORT_COMPLETED: "spancle.report.completed";
    readonly REPORT_FAILED: "spancle.report.failed";
};
export type EventChannel = typeof EventRegistry[keyof typeof EventRegistry];
//# sourceMappingURL=event-registry.d.ts.map