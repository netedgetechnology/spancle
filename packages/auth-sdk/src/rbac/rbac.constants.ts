import type { Permission } from '@spancle/types';

/**
 * Default permission sets per system role.
 * Tenant admins may augment these via custom Role definitions.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    { resource: '*', action: 'manage', scope: 'global' },
  ],

  TENANT_ADMIN: [
    { resource: '*',            action: 'manage',  scope: 'tenant' },
  ],

  TENANT_MANAGER: [
    { resource: 'booking',      action: 'manage',  scope: 'tenant' },
    { resource: 'player',       action: 'manage',  scope: 'tenant' },
    { resource: 'tournament',   action: 'manage',  scope: 'tenant' },
    { resource: 'invoice',      action: 'read',    scope: 'tenant' },
    { resource: 'report',       action: 'read',    scope: 'tenant' },
    { resource: 'user',         action: 'read',    scope: 'tenant' },
  ],

  COACH: [
    { resource: 'player',       action: 'read',    scope: 'tenant' },
    { resource: 'player',       action: 'update',  scope: 'tenant' },
    { resource: 'booking',      action: 'read',    scope: 'tenant' },
    { resource: 'match',        action: 'update',  scope: 'tenant' },
    { resource: 'tournament',   action: 'read',    scope: 'tenant' },
  ],

  PLAYER: [
    { resource: 'booking',      action: 'create',  scope: 'own' },
    { resource: 'booking',      action: 'read',    scope: 'own' },
    { resource: 'booking',      action: 'delete',  scope: 'own' },
    { resource: 'invoice',      action: 'read',    scope: 'own' },
    { resource: 'tournament',   action: 'read',    scope: 'tenant' },
  ],

  PARENT: [
    { resource: 'booking',      action: 'create',  scope: 'own' },
    { resource: 'booking',      action: 'read',    scope: 'own' },
    { resource: 'invoice',      action: 'read',    scope: 'own' },
    { resource: 'player',       action: 'read',    scope: 'own' },
  ],


  RECEPTIONIST: [
    // Front desk: can create/read/manage bookings and walk-in payments; no admin ops
    { resource: 'booking',      action: 'create',  scope: 'tenant' },
    { resource: 'booking',      action: 'read',    scope: 'tenant' },
    { resource: 'booking',      action: 'update',  scope: 'tenant' },
    { resource: 'booking',      action: 'delete',  scope: 'tenant' },
    { resource: 'slot',         action: 'read',    scope: 'tenant' },
    { resource: 'payment',      action: 'create',  scope: 'tenant' },
    { resource: 'payment',      action: 'read',    scope: 'tenant' },
    { resource: 'invoice',      action: 'read',    scope: 'tenant' },
    { resource: 'customer',     action: 'read',    scope: 'tenant' },
    { resource: 'qr',           action: 'read',    scope: 'tenant' },
  ],

  CASHIER: [
    // Finance desk: payments, invoices, refunds, reconciliation — no booking creation
    { resource: 'payment',      action: 'manage',  scope: 'tenant' },
    { resource: 'invoice',      action: 'manage',  scope: 'tenant' },
    { resource: 'wallet',       action: 'read',    scope: 'tenant' },
    { resource: 'report',       action: 'read',    scope: 'tenant' },
    { resource: 'booking',      action: 'read',    scope: 'tenant' },
  ],

  REPORT_VIEWER: [
    // Read-only access to all reports and analytics — no mutations
    { resource: 'report',       action: 'read',    scope: 'tenant' },
    { resource: 'analytics',    action: 'read',    scope: 'tenant' },
    { resource: 'booking',      action: 'read',    scope: 'tenant' },
    { resource: 'invoice',      action: 'read',    scope: 'tenant' },
    { resource: 'payment',      action: 'read',    scope: 'tenant' },
  ],

  MEMBER: [
    // Registered member: same as PLAYER but semantically clearer for sports-club context
    { resource: 'booking',      action: 'create',  scope: 'own' },
    { resource: 'booking',      action: 'read',    scope: 'own' },
    { resource: 'booking',      action: 'delete',  scope: 'own' },
    { resource: 'invoice',      action: 'read',    scope: 'own' },
    { resource: 'payment',      action: 'read',    scope: 'own' },
  ],
  VIEWER: [
    { resource: 'booking',      action: 'read',    scope: 'tenant' },
    { resource: 'tournament',   action: 'read',    scope: 'tenant' },
    { resource: 'player',       action: 'read',    scope: 'tenant' },
  ],
};
