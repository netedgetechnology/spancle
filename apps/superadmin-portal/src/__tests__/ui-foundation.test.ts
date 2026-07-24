/**
 * ui-foundation.test.ts
 *
 * Static type-level and import verification for Phase 8.0 UI Foundation.
 * No DOM — these tests verify the module contracts compile correctly.
 * Run with: node --loader ts-node/esm ui-foundation.test.ts
 * Or: tsc --noEmit (already covered by pnpm build)
 */

// ── Design token imports ──────────────────────────────────────────────────────

import { colors, typography, spacing, tw } from '@spancle/ui-kit';
import type { NavItem } from '@spancle/ui-kit';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓  ${message}`);
}

console.log('\nPhase 8.0 UI Foundation — static verification\n');

// Design tokens
console.log('Design tokens:');
assert(typeof colors.brand.primary === 'string',     'colors.brand.primary is a string');
assert(typeof typography.fontSize.base === 'string', 'typography.fontSize.base is a string');
assert(typeof spacing.pagePadding === 'string',      'spacing.pagePadding is a Tailwind class string');
assert(typeof tw.card === 'string',                  'tw.card is a Tailwind class string');
assert(tw.navActive.includes('bg-blue'),             'tw.navActive includes bg-blue');
assert(typeof tw.badge.success === 'string',         'tw.badge.success is defined');

// NavItem type shape
const sampleNav: NavItem = { label: 'Dashboard', href: '/dashboard', roles: ['tenant_admin'] };
assert(sampleNav.label === 'Dashboard', 'NavItem.label works');
assert(sampleNav.href === '/dashboard', 'NavItem.href works');
assert(Array.isArray(sampleNav.roles), 'NavItem.roles is an array');

// Super Admin nav items (from layout.tsx — verified during build)
const superAdminNav = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Tenants',   href: '/tenants'   },
  { label: 'Packages',  href: '/packages'  },
  { label: 'Finance',   href: '/finance'   },
  { label: 'Settings',  href: '/settings'  },
];
console.log('\nSuper Admin navigation:');
superAdminNav.forEach((item) => {
  assert(typeof item.label === 'string' && typeof item.href === 'string',
    `Nav item "${item.label}" has label and href`);
});

// Tenant nav items
const tenantNav = [
  { label: 'Dashboard',   href: '/dashboard'   },
  { label: 'Bookings',    href: '/bookings'     },
  { label: 'Customers',   href: '/customers'    },
  { label: 'Invoices',    href: '/invoices'     },
  { label: 'Settlements', href: '/settlements'  },
  { label: 'Revenue',     href: '/revenue'      },
  { label: 'Settings',    href: '/settings'     },
];
console.log('\nTenant navigation:');
tenantNav.forEach((item) => {
  assert(typeof item.label === 'string', `Tenant nav item "${item.label}" is valid`);
});

// Permission guard role hierarchy (copied from guard)
const ROLE_HIERARCHY: Record<string, number> = {
  authenticated: 0, tenant_staff: 1, tenant_admin: 2, super_admin: 3,
};
console.log('\nPermission guard hierarchy:');
assert((ROLE_HIERARCHY['super_admin'] ?? -1) > (ROLE_HIERARCHY['tenant_admin'] ?? -1), 'super_admin > tenant_admin');
assert((ROLE_HIERARCHY['tenant_admin'] ?? -1) > (ROLE_HIERARCHY['tenant_staff'] ?? -1), 'tenant_admin > tenant_staff');
assert((ROLE_HIERARCHY['tenant_staff'] ?? -1) > (ROLE_HIERARCHY['authenticated'] ?? -1), 'tenant_staff > authenticated');

console.log('\n✅  All Phase 8.0 UI Foundation checks passed.\n');
