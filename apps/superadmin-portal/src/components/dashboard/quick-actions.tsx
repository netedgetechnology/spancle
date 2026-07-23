/**
 * quick-actions.tsx
 *
 * QuickActions — a grid of navigation shortcut cards for the dashboard.
 *
 * Each action card links to a route, shows an icon and label,
 * and optionally carries a badge (e.g. notification count).
 *
 * Server Component safe — no state, no effects.
 * Accessible: keyboard navigable, focus-visible ring, ARIA labels.
 */

import Link        from 'next/link';
import { cn }      from '@/lib/utils/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuickAction {
  label:        string;
  href:         string;
  description:  string;
  /** Tailwind background colour class for the icon container. */
  iconBg:       string;
  /** Tailwind text colour class for the icon. */
  iconColor:    string;
  icon:         React.ReactNode;
  badge?:       string | number;
}

interface QuickActionsProps {
  actions?:   QuickAction[];
  className?: string;
}

// ── Default super-admin actions ───────────────────────────────────────────────

export const SUPERADMIN_QUICK_ACTIONS: QuickAction[] = [
  {
    label:       'Create Tenant',
    href:        '/tenants/new',
    description: 'Onboard a new organisation',
    iconBg:      'bg-blue-50',
    iconColor:   'text-blue-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label:       'Manage Tenants',
    href:        '/tenants',
    description: 'View and edit tenant accounts',
    iconBg:      'bg-violet-50',
    iconColor:   'text-violet-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    label:       'Subscription Plans',
    href:        '/packages',
    description: 'Manage tiers and pricing',
    iconBg:      'bg-emerald-50',
    iconColor:   'text-emerald-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    label:       'Finance',
    href:        '/finance',
    description: 'Revenue and settlement overview',
    iconBg:      'bg-amber-50',
    iconColor:   'text-amber-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label:       'Platform Settings',
    href:        '/settings',
    description: 'System configuration',
    iconBg:      'bg-gray-100',
    iconColor:   'text-gray-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// ── QuickActions ──────────────────────────────────────────────────────────────

export function QuickActions({
  actions = SUPERADMIN_QUICK_ACTIONS,
  className,
}: QuickActionsProps): React.ReactElement {
  return (
    <nav aria-label="Quick actions" className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3', className)}>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            'group relative flex flex-col items-center gap-2.5 rounded-xl border border-gray-200 bg-white',
            'p-4 text-center shadow-sm transition-all duration-150',
            'hover:border-blue-200 hover:shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          )}
          aria-label={`${action.label} — ${action.description}`}
        >
          {/* Badge */}
          {action.badge !== undefined && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {action.badge}
            </span>
          )}

          {/* Icon */}
          <span
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
              action.iconBg, action.iconColor,
            )}
            aria-hidden="true"
          >
            {action.icon}
          </span>

          {/* Label */}
          <div>
            <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 transition-colors leading-tight">
              {action.label}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight hidden sm:block">
              {action.description}
            </p>
          </div>
        </Link>
      ))}
    </nav>
  );
}
