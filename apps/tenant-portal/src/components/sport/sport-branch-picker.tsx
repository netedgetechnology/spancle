'use client';

import { useQuery } from '@tanstack/react-query';
import { cn }       from '@/lib/utils/cn';
import { branchKeys, fetchBranches } from '@/lib/branch.api';
import type { Branch as _Branch } from '@/types/branch.types';

interface SportBranchPickerProps {
  selectedIds: string[];
  onChange:    (ids: string[]) => void;
  disabled?:   boolean;
}

/**
 * SportBranchPicker — multi-select branch assignment for a sport.
 *
 * Fetches the tenant's branches (active + inactive — not archived)
 * and renders a selectable list. Archived branches are excluded from
 * the API response and from this component.
 *
 * Controls:
 *   - Individual toggle per branch
 *   - Select all / Clear all shortcuts
 *
 * Empty assignment = sport available at all branches (global).
 * The label "All branches" is shown when nothing is selected.
 */
export function SportBranchPicker({
  selectedIds,
  onChange,
  disabled = false,
}: SportBranchPickerProps): React.ReactElement {
  const { data: branches = [], isLoading } = useQuery({
    queryKey: branchKeys.list(),
    queryFn:  () => fetchBranches(),          // all statuses — archived excluded by API
    staleTime: 30_000,
  });

  // Only show non-archived branches
  const eligible = branches.filter((b) => b.status !== 'archived');

  const toggle = (id: string): void => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = (): void => onChange(eligible.map((b) => b.id));
  const clearAll  = (): void => onChange([]);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (eligible.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center">
        <p className="text-sm text-gray-400">No branches available</p>
        <p className="text-xs text-gray-300 mt-1">Create branches first, then assign them to sports</p>
      </div>
    );
  }

  const allSelected  = eligible.length > 0 && selectedIds.length === eligible.length;
  const noneSelected = selectedIds.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Summary + controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {noneSelected ? (
            <span className="text-emerald-600 font-medium">Available at all branches</span>
          ) : (
            <span>
              <span className="font-semibold text-gray-800">{selectedIds.length}</span>
              {' of '}
              <span className="font-semibold text-gray-800">{eligible.length}</span>
              {' branches selected'}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled || allSelected}
            className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
          >
            Select all
          </button>
          <span className="text-gray-300" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled || noneSelected}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Branch list */}
      <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {eligible.map((branch) => {
          const isSelected = selectedIds.includes(branch.id);
          const isInactive = branch.status === 'inactive';

          return (
            <label
              key={branch.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none',
                disabled && 'cursor-not-allowed opacity-50',
                isSelected && !disabled
                  ? 'bg-primary-50 hover:bg-primary-50'
                  : 'bg-white hover:bg-gray-50',
              )}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(branch.id)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
              />

              {/* Branch name + status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium truncate',
                    isSelected ? 'text-primary-800' : 'text-gray-800',
                  )}>
                    {branch.name}
                  </span>
                  {isInactive && (
                    <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Inactive
                    </span>
                  )}
                </div>
                {branch.city && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {branch.city}{branch.postcode ? ` · ${branch.postcode}` : ''}
                  </p>
                )}
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <svg
                  className="h-4 w-4 text-primary-600 flex-shrink-0"
                  fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </label>
          );
        })}
      </div>

      {noneSelected && (
        <p className="text-xs text-gray-400 leading-relaxed">
          Leave empty to make this sport available at all branches.
          Select specific branches to restrict availability.
        </p>
      )}
    </div>
  );
}
