'use client';

import { cn } from '@/lib/utils/cn';
import { STATUS_CONFIG, formatPrice, type Package } from '@/types/packages.types';

interface PackageTableProps {
  packages:     Package[];
  isLoading?:   boolean;
  onEdit:       (pkg: Package) => void;
  onPublish?:   (id: string) => void;
  onDeprecate?: (id: string) => void;
  onArchive?:   (id: string) => void;
  onClone?:     (id: string) => void;
  onDelete?:    (id: string) => void;
}

/**
 * PackageTable — sortable list of all package definitions.
 * Shows tier, pricing, status, feature count, trial days, and quick actions.
 */
export function PackageTable({
  packages, isLoading = false,
  onEdit, onPublish, onDeprecate, onArchive, onClone,
}: PackageTableProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-14 border-b border-gray-100 flex items-center px-4 gap-4">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 w-12 rounded bg-gray-200 ml-auto" />
        </div>)}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
        <p className="text-sm font-medium text-gray-500">No packages yet</p>
        <p className="text-xs text-gray-400 mt-1">Create your first package or run the seed operation</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full" aria-label="Package definitions">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Package', 'Tier', 'Monthly', 'Annual', 'Trial', 'Features', 'Status', 'Actions'].map(h => (
              <th key={h} className={cn(
                'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500',
                ['Monthly', 'Annual', 'Trial', 'Features'].includes(h) && 'hidden md:table-cell',
              )}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {packages.map(pkg => {
            const sc             = STATUS_CONFIG[pkg.status];
            const featureCount   = Object.values(pkg.features ?? {}).filter(Boolean).length;

            return (
              <tr key={pkg.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900">{pkg.name}</span>
                      {pkg.isHighlighted && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          {pkg.badgeText ?? 'Featured'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-gray-400">{pkg.slug}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {pkg.tierKey}
                  </span>
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-700 tabular-nums">
                  {formatPrice(pkg.priceMonthlyMinorUnits, pkg.currency)}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-700 tabular-nums">
                  {formatPrice(pkg.priceAnnualMinorUnits, pkg.currency)}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">
                  {pkg.trialDays > 0 ? `${pkg.trialDays}d` : '—'}
                </td>
                <td className="hidden md:table-cell px-4 py-3">
                  <span className="text-xs text-gray-600">{featureCount}/10</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', sc.bg, sc.text)}>
                    {sc.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button onClick={() => onEdit(pkg)}
                      className="text-xs text-primary-600 hover:underline font-medium">Edit</button>
                    {pkg.status === 'draft' && onPublish && (
                      <button onClick={() => onPublish(pkg.id)}
                        className="text-xs text-emerald-600 hover:underline font-medium">Publish</button>
                    )}
                    {pkg.status === 'active' && onDeprecate && (
                      <button onClick={() => onDeprecate(pkg.id)}
                        className="text-xs text-amber-600 hover:underline font-medium">Deprecate</button>
                    )}
                    {pkg.status !== 'archived' && onArchive && (
                      <button onClick={() => onArchive(pkg.id)}
                        className="text-xs text-gray-400 hover:text-red-500 hover:underline font-medium">Archive</button>
                    )}
                    {onClone && (
                      <button onClick={() => onClone(pkg.id)}
                        className="text-xs text-gray-500 hover:underline font-medium">Clone</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
