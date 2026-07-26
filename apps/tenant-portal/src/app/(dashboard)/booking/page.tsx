'use client';

import { useState, useCallback, useMemo } from 'react';
import Link                               from 'next/link';
import { useQuery }                       from '@tanstack/react-query';
import { BookingLeftPanel }               from '@/components/booking/booking-left-panel';
import { BookingTimeline }                from '@/components/booking/booking-timeline';
import type { DragCreateResult, DragRescheduleResult } from '@/components/booking/booking-timeline';
import { BookingPanel }                   from '@/components/booking/booking-panel';
import { BookingDrawer }                  from '@/components/booking/booking-drawer';
import { fetchBranches, branchKeys }      from '@/lib/branch.api';
import { fetchCourts,   courtKeys }       from '@/lib/court.api';
import { fetchSports,   sportKeys }       from '@/lib/sport.api';
import { fetchCalendarSlots, slotKeys }   from '@/lib/slot.api';
import { rescheduleBooking }              from '@/lib/booking.api';
import { rateCardKeys }                   from '@/lib/rate-card.api';
import type { Slot }                      from '@/types/slot.types';
import type { RateCard }                  from '@/lib/rate-card.api';

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export default function BookingDashboardPage(): React.ReactElement {

  const [branchId,        setBranchId]        = useState('');
  const [courtIdFilter,   setCourtIdFilter]   = useState('');
  const [sportId,         setSportId]         = useState('');
  const [date,            setDate]            = useState(todayISO());
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [drawerBookingId, setDrawerBookingId] = useState<string | null>(null);
  const [dragError,       setDragError]       = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: branches = [] } = useQuery({
    queryKey: branchKeys.list('active'),
    queryFn:  () => fetchBranches('active'),
  });

  const { data: allCourts = [] } = useQuery({
    queryKey: courtKeys.list({ branchId, status: 'available' }),
    queryFn:  () => fetchCourts({ branchId: branchId || undefined }),
    enabled:  !!branchId,
  });

  const activeCourts = allCourts.filter((c) => c.status === 'available');

  const { data: sports = [] } = useQuery({
    queryKey: sportKeys.list('active'),
    queryFn:  () => fetchSports('active'),
    enabled:  !!branchId,
  });

  const visibleCourts = useMemo(() => {
    let result = activeCourts;
    if (sportId)       result = result.filter((c) => c.sportId === sportId);
    if (courtIdFilter) result = result.filter((c) => c.id === courtIdFilter);
    return result;
  }, [activeCourts, sportId, courtIdFilter]);

  const { data: allSlots = [], isLoading: slotsLoading, refetch } = useQuery({
    queryKey: slotKeys.calendar({ branchId, date, courtId: null, sportId: null, status: null }),
    queryFn:  () => fetchCalendarSlots({ branchId, date, courtId: null, sportId: null, status: null }),
    enabled:  !!branchId && !!date,
    refetchInterval: 30_000,
  });

  const visibleCourtIds = useMemo(() => new Set(visibleCourts.map((c) => c.id)), [visibleCourts]);
  const slots = useMemo(
    () => allSlots.filter((s) => visibleCourtIds.has(s.courtId)),
    [allSlots, visibleCourtIds],
  );

  const { data: allRateCards = [] } = useQuery({
    queryKey: rateCardKeys.list({ isActive: true }),
    queryFn:  () => import('@/lib/rate-card.api').then((m) => m.fetchRateCards({ isActive: true })).then((r) => r.data),
    enabled:  !!branchId,
  });

  const rateCards = useMemo((): Map<string, RateCard> => {
    const map = new Map<string, RateCard>();
    for (const rc of allRateCards) map.set(rc.id, rc);
    return map;
  }, [allRateCards]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAvailableClick = useCallback((slot: Slot) => {
    setSelectedSlotIds((prev) =>
      prev.includes(slot.id) ? prev.filter((id) => id !== slot.id) : [...prev, slot.id],
    );
  }, []);

  const handleBookedClick = useCallback((slot: Slot) => {
    // Toggle selection so BookingPanel shows waitlist section
    setSelectedSlotIds((prev) =>
      prev.includes(slot.id) ? prev.filter((id) => id !== slot.id) : [...prev, slot.id],
    );
    if (slot.bookingId) setDrawerBookingId(slot.bookingId);
  }, []);

  const handleBranchChange = (id: string) => {
    setBranchId(id); setCourtIdFilter(''); setSportId(''); setSelectedSlotIds([]);
  };

  const handleDateChange = (d: string) => { setDate(d); setSelectedSlotIds([]); };

  const selectedSlots = useMemo(
    () => slots.filter((s) => selectedSlotIds.includes(s.id)),
    [slots, selectedSlotIds],
  );

  // Drag-to-create: find the first available slot in the ghost time range
  const handleDragCreate = useCallback((result: DragCreateResult) => {
    const GRID_START_H = 6;
    const startMs = new Date(date + 'T00:00:00Z').getTime() +
      (GRID_START_H * 60 + result.startMin) * 60_000;
    const endMs   = new Date(date + 'T00:00:00Z').getTime() +
      (GRID_START_H * 60 + result.endMin) * 60_000;

    // Find slots in the dragged time range for this court
    const matching = allSlots.filter((s) => {
      const sStart = new Date(s.startAt).getTime();
      const sEnd   = new Date(s.endAt).getTime();
      return s.courtId === result.courtId &&
             s.status  === 'available' &&
             sStart    >= startMs &&
             sEnd      <= endMs;
    });

    if (matching.length === 0) {
      setDragError('No available slots in the selected time range');
      setTimeout(() => setDragError(null), 3000);
      return;
    }

    setSelectedSlotIds(matching.map((s) => s.id));
  }, [allSlots, date]);

  // Drag-to-reschedule: call rescheduleBooking API
  const handleDragReschedule = useCallback(async (result: DragRescheduleResult) => {
    if (!result.slot.bookingId) return;

    const GRID_START_H = 6;
    const newStartMs = new Date(date + 'T00:00:00Z').getTime() +
      (GRID_START_H * 60 + result.newStartMin) * 60_000;

    // Find slots starting at the drop position on the target court
    const dur      = new Date(result.slot.endAt).getTime() - new Date(result.slot.startAt).getTime();
    const newEndMs = newStartMs + dur;

    const targetSlots = allSlots.filter((s) => {
      const sStart = new Date(s.startAt).getTime();
      const sEnd   = new Date(s.endAt).getTime();
      return s.courtId === result.newCourtId &&
             s.status  === 'available' &&
             sStart    >= newStartMs  &&
             sEnd      <= newEndMs;
    });

    if (targetSlots.length === 0) {
      setDragError('No available slots at the drop location');
      setTimeout(() => setDragError(null), 3000);
      return;
    }

    try {
      await rescheduleBooking(
        result.slot.bookingId,
        targetSlots.map((s) => s.id),
        'Rescheduled via reception dashboard drag',
      );
      void refetch();
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'Reschedule failed');
      setTimeout(() => setDragError(null), 4000);
    }
  }, [allSlots, date, refetch]);

  const branchName = branches.find((b) => b.id === branchId)?.name ?? '';

  return (
    <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 6rem)' }}>
      {/* Page header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Reception Dashboard</h2>
          <p className="text-[11px] text-gray-400">
            {branchName
              ? `${branchName} · ${new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
              : 'Select a venue to view availability'}
          </p>
        </div>
        <Link
          href="/bookings"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
        >
          All bookings →
        </Link>
      </div>

      {/* Drag error toast */}
      {dragError && (
        <div className="flex-shrink-0 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs text-red-700 font-medium">
          {dragError}
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateColumns: '200px 1fr 260px' }}>
        {/* LEFT */}
        <BookingLeftPanel
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          courts={activeCourts.map((c) => ({ id: c.id, name: c.name, rateCardId: c.rateCardId ?? null, sportId: c.sportId ?? null }))}
          sports={sports}
          branchId={branchId}
          courtId={courtIdFilter}
          sportId={sportId}
          date={date}
          onBranchChange={handleBranchChange}
          onCourtChange={(id) => { setCourtIdFilter(id); setSelectedSlotIds([]); }}
          onSportChange={(id) => { setSportId(id); setSelectedSlotIds([]); }}
          onDateChange={handleDateChange}
          onRefresh={() => void refetch()}
          isRefreshing={slotsLoading}
          selectedCount={selectedSlotIds.length}
          branchName={branchName}
        />

        {/* CENTER */}
        <BookingTimeline
          slots={slots}
          courts={visibleCourts}
          selectedSlotIds={selectedSlotIds}
          onAvailableClick={handleAvailableClick}
          onBookedClick={handleBookedClick}
          onDragCreate={handleDragCreate}
          onDragReschedule={handleDragReschedule}
          isLoading={slotsLoading && !!branchId}
          date={date}
        />

        {/* RIGHT */}
        <BookingPanel
          selectedSlots={selectedSlots}
          courts={activeCourts}
          branchId={branchId}
          branchName={branchName}
          date={date}
          rateCards={rateCards}
          onClear={() => setSelectedSlotIds([])}
          onSuccess={() => { setSelectedSlotIds([]); void refetch(); }}
        />
      </div>

      {/* Detail drawer */}
      <BookingDrawer
        bookingId={drawerBookingId}
        onClose={() => setDrawerBookingId(null)}
      />
    </div>
  );
}
