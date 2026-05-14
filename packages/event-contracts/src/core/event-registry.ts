
/**
 * EventRegistry — canonical list of all platform event channels.
 * Consumers subscribe to these. Producers publish to these.
 *
 * Single source of truth — prevents string typos in channel names.
 */
export const EventRegistry = {
  // ── Identity ──────────────────────────────────────────────────────────────
  IDENTITY_LOGIN_SUCCESS:     'spancle.identity.login_success',
  IDENTITY_LOGIN_FAILED:      'spancle.identity.login_failed',
  IDENTITY_LOGOUT:            'spancle.identity.logout',
  IDENTITY_PASSWORD_CHANGED:  'spancle.identity.password_changed',
  IDENTITY_PASSWORD_RESET:    'spancle.identity.password_reset',
  IDENTITY_ACCOUNT_LOCKED:    'spancle.identity.account_locked',
  IDENTITY_CREATED:           'spancle.identity.created',
  IDENTITY_DEACTIVATED:       'spancle.identity.deactivated',

  // ── Tenant ────────────────────────────────────────────────────────────────
  TENANT_CREATED:             'spancle.tenant.created',
  TENANT_UPDATED:             'spancle.tenant.updated',
  TENANT_ACTIVATED:           'spancle.tenant.activated',
  TENANT_SUSPENDED:           'spancle.tenant.suspended',
  TENANT_TERMINATED:          'spancle.tenant.terminated',
  TENANT_TIER_CHANGED:        'spancle.tenant.tier_changed',

  // ── User ──────────────────────────────────────────────────────────────────
  USER_CREATED:               'spancle.user.created',
  USER_UPDATED:               'spancle.user.updated',
  USER_DELETED:               'spancle.user.deleted',
  USER_ROLE_CHANGED:          'spancle.user.role_changed',

  // ── Booking ───────────────────────────────────────────────────────────────
  BOOKING_CREATED:            'spancle.booking.created',
  BOOKING_CONFIRMED:          'spancle.booking.confirmed',
  BOOKING_CANCELLED:          'spancle.booking.cancelled',
  BOOKING_COMPLETED:          'spancle.booking.completed',
  BOOKING_NO_SHOW:            'spancle.booking.no_show',

  // ── Finance ───────────────────────────────────────────────────────────────
  INVOICE_CREATED:            'spancle.invoice.created',
  INVOICE_PAID:               'spancle.invoice.paid',
  INVOICE_OVERDUE:            'spancle.invoice.overdue',
  INVOICE_VOIDED:             'spancle.invoice.voided',
  PAYMENT_SUCCEEDED:          'spancle.payment.succeeded',
  PAYMENT_FAILED:             'spancle.payment.failed',
  PAYMENT_REFUNDED:           'spancle.payment.refunded',
  WALLET_CREDITED:            'spancle.wallet.credited',
  WALLET_DEBITED:             'spancle.wallet.debited',

  // ── Tournament ────────────────────────────────────────────────────────────
  TOURNAMENT_CREATED:         'spancle.tournament.created',
  TOURNAMENT_STARTED:         'spancle.tournament.started',
  TOURNAMENT_COMPLETED:       'spancle.tournament.completed',
  TOURNAMENT_CANCELLED:       'spancle.tournament.cancelled',
  MATCH_SCHEDULED:            'spancle.match.scheduled',
  MATCH_STARTED:              'spancle.match.started',
  MATCH_COMPLETED:            'spancle.match.completed',
  MATCH_SCORE_UPDATED:        'spancle.match.score_updated',

  // ── Academy ───────────────────────────────────────────────────────────────
  PLAYER_REGISTERED:          'spancle.player.registered',
  PLAYER_ACTIVATED:           'spancle.player.activated',
  PLAYER_SUSPENDED:           'spancle.player.suspended',
  PLAYER_LEVEL_CHANGED:       'spancle.player.level_changed',
  COACH_ASSIGNED:             'spancle.coach.assigned',

  // ── Communication ─────────────────────────────────────────────────────────
  NOTIFICATION_QUEUED:        'spancle.notification.queued',
  NOTIFICATION_SENT:          'spancle.notification.sent',
  NOTIFICATION_FAILED:        'spancle.notification.failed',

  // ── Reporting ─────────────────────────────────────────────────────────────
  REPORT_REQUESTED:           'spancle.report.requested',
  REPORT_COMPLETED:           'spancle.report.completed',
  REPORT_FAILED:              'spancle.report.failed',
} as const;

export type EventChannel = typeof EventRegistry[keyof typeof EventRegistry];
