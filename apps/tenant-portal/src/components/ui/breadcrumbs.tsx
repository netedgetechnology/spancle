'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items:     BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumbs — accessible navigation trail.
 * Last item is always current page (no href rendered as link).
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500" role="list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1">
              {idx > 0 && (
                <svg className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {isLast || !item.href ? (
                <span
                  className={cn('font-medium', isLast ? 'text-gray-900' : 'text-gray-500')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gray-700 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
