'use client';

import { useState, useCallback } from 'react';
import { useQuery }               from '@tanstack/react-query';
import { CalendarFilterBar }      from '@/components/slot/calendar-filter-bar';
import { CalendarGrid }           from '@/components/slot/calendar-grid';
import { OccupancySummaryBar }    from '@/components/slot/occupancy-summary-bar';
import { SlotDetailPanel }        from '@/components/slot/slot-detail-panel';
import { BookingModal }           from '@/components/booking/booking-modal';
import { fetchCalendarSlots, slotKeys } from '@/lib/slot.api';
import { fetchCourts, courtKeys }        from '@/lib/court.api';
import {
  computeOccupancy,
  DEFAULT_FILTERS,
  type CalendarFilters,
  type Slot,
} from '@/types/slot.types';

export default function CalendarPage(): React.ReactElement {
  const [filters, setFilters]             = useState<CalendarFilters>(DEFAULT_FILTERS);
  const [selectedSlot, setSelectedSlot]   = useState<Slot | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [modalDefaultSlot, setModalDefaultSlot] = useState<Slot | null>(null);

  const patchFilters = useCallback(
    (patch: Partial<CalendarFilters>) => setFilters((f) => ({ ...f, ...patch })),
    [],
  );

  const {
    data: slots = [], isLoading: slotsLoading,
    error: slotsError, refetch: refetchSlots,
  } = useQuery({
    queryKey: slotKeys.calendar(filters),
    queryFn:  () => fetchCalendarSlots(filters),
    staleTime: 30_000,
  });

  const { data: courts = [] } = useQuery({
    queryKey: courtKeys.list(filters.branchId ? { branchId: filters.branchId } : {}),
    queryFn:  () => fetchCourts(filters.branchId ? { branchId: filters.branchId } : undefined),
    staleTime: 60_000,
  });

  const occupancy = computeOccupancy(slots);

  const handleSlotClick = (slot: Slot): void => {
    setSelectedSlot(slot);
    // If slot is available/reserved — open booking modal pre-seeded
    if (slot.status === 'available') {
      setModalDefaultSlot(slot);
    }
  };

  return (
    <>
    <div className="flex flex-col gap-5 relative">
      {showBookingModal && (
        <BookingModal
          onClose={() => { setShowBookingModal(false); setModalDefaultSlot(null); }}
          defaultDate={filters.date}
          defaultCourtId={modalDefaultSlot?.courtId ?? filters.courtId ?? ''}
          defaultBranchId={modalDefaultSlot?.branchId ?? filters.branchId ?? ''}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage slot availability, reservations, and occupancy</p>
        </div>
        <button
          type="button"
          onClick={() => { setModalDefaultSlot(null); setShowBookingModal(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New booking
        </button>
      </div>

      <CalendarFilterBar filters={filters} onChange={patchFilters} isLoading={slotsLoading} />
      <OccupancySummaryBar summary={occupancy} isLoading={slotsLoading} />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {([
          ['bg-emerald-500', 'Available'], ['bg-amber-400', 'Reserved'],
          ['bg-blue-500', 'Booked'],       ['bg-slate-400', 'Completed'],
          ['bg-red-300', 'Unavailable'],   ['bg-gray-300', 'Cancelled'],
        ] as [string, string][]).map(([color, label]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className={`h-2.5 w-2.5 rounded-sm flex-shrink-0 ${color}`} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>

      <div className="relative">
        <div className="transition-all duration-300" style={{ marginRight: selectedSlot ? '320px' : undefined }}>
          <CalendarGrid
            slots={slots}
            courts={courts}
            filters={filters}
            isLoading={slotsLoading}
            error={slotsError as Error | null}
            onRefetch={() => void refetchSlots()}
            onSlotClick={handleSlotClick}
          />
        </div>
        <SlotDetailPanel
          slot={selectedSlot}
          filters={filters}
          onClose={() => setSelectedSlot(null)}
        />
      </div>

      {!slotsLoading && slots.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm font-medium text-gray-500">No slots for this day</p>
          <p className="text-xs text-gray-400 mt-1">Generate slots in Courts or adjust your filters</p>
        </div>
      )}
    </div>
</>
  );
}
