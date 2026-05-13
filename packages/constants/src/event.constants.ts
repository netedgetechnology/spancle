/**
 * Event Constants
 * Redis Pub/Sub channel patterns and event routing.
 *
 * Channel naming convention:
 *   spancle.{domain}.{entity}.{action}
 *
 * Wildcard subscriptions:
 *   spancle.*           — all platform events
 *   spancle.identity.*  — all identity events
 */

export const EVENT_CHANNEL_PREFIX = 'spancle' as const;

export const EVENT_DOMAINS = {
  IDENTITY:      'identity',
  TENANT:        'tenant',
  USER:          'user',
  ROLE:          'role',
  BOOKING:       'booking',
  SLOT:          'slot',
  VENUE:         'venue',
  INVOICE:       'invoice',
  PAYMENT:       'payment',
  WALLET:        'wallet',
  TOURNAMENT:    'tournament',
  BRACKET:       'bracket',
  MATCH:         'match',
  ACADEMY:       'academy',
  PLAYER:        'player',
  COACH:         'coach',
  NOTIFICATION:  'notification',
  MESSAGE:       'message',
  REPORT:        'report',
} as const;

export type EventDomain = typeof EVENT_DOMAINS[keyof typeof EVENT_DOMAINS];

export const EVENT_ACTIONS = {
  CREATED:        'created',
  UPDATED:        'updated',
  DELETED:        'deleted',
  ACTIVATED:      'activated',
  DEACTIVATED:    'deactivated',
  STATUS_CHANGED: 'status_changed',
  PUBLISHED:      'published',
  CANCELLED:      'cancelled',
  COMPLETED:      'completed',
  FAILED:         'failed',
  SENT:           'sent',
  VIEWED:         'viewed',
} as const;

export type EventAction = typeof EVENT_ACTIONS[keyof typeof EVENT_ACTIONS];

/** Builds a typed event channel string */
export function buildEventChannel(domain: EventDomain, action: EventAction): string {
  return `${EVENT_CHANNEL_PREFIX}.${domain}.${action}`;
}

/** Builds a tenant-scoped event channel */
export function buildTenantEventChannel(
  tenantId: string,
  domain: EventDomain,
  action: EventAction,
): string {
  return `${EVENT_CHANNEL_PREFIX}.${tenantId}.${domain}.${action}`;
}
