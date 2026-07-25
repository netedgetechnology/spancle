'use client';

import { useState, useCallback, useMemo }   from 'react';
import Link                                  from 'next/link';
import { useQuery }                          from '@tanstack/react-query';
import { BookingLeftPanel }                  from '@/components/booking/booking-left-panel';
import { BookingTimeline }                   from '@/components/booking/booking-timeline';
import { BookingPanel }                      from '@/components/booking/booking-panel';
import { BookingDrawer }                     from '@/components/booking/booking-drawer';
import { fetchBranches, branchKeys }         from '@/lib/branch.api';
import { fetchCourts,   courtKeys }          from '@/lib/court.api';
import { fetchSports,   sportKeys }          from '@/lib/sport.api';
import { fetchCalendarSlots, slotKeys }      from '@/lib/slot.api';
import { rateCardKeys }                       from '@/lib/rate-card.api';
import type { Slot }                         from '@/types/slot.types';
import type { RateCard }                     from '@/lib/rate-card.api';
import { RouteDebugPanel } from '@/components/debug/route-debug-panel'; // TEMP_DEBUG

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export default function BookingDashboardPage(): React.ReactElement {
  const [branchId,         setBranchId]         = useState('');
  const [courtIdFilter,    setCourtIdFilter]     = useState('');
  const [sportId,          setSportId]           = useState('');
  const [date,             setDate]              = useState(todayISO());
  const [selectedSlotIds,  setSelectedSlotIds]   = useState<string[]>([]);
  const [drawerBookingId,  setDrawerBookingId]   = useState<string | null>(null);

  // ── Data queries ───────────────────────────────────────────────────────────

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

  // Apply court + sport filter for the timeline view
  const visibleCourts = useMemo(() => {
    let result = activeCourts;
    if (sportId)       result = result.filter((c) => c.sportId === sportId);
    if (courtIdFilter) result = result.filter((c) => c.id === courtIdFilter);
    return result;
  }, [activeCourts, sportId, courtIdFilter]);

  // ALL slots for branch+date (all courts) — one query for the whole timeline
  const { data: allSlots = [], isLoading: slotsLoading, refetch } = useQuery({
    queryKey: slotKeys.calendar({ branchId, date, courtId: null, sportId: null, status: null }),
    queryFn:  () => fetchCalendarSlots({ branchId, date, courtId: null, sportId: null, status: null }),
    enabled:  !!branchId && !!date,
    refetchInterval: 30_000,
  });

  // Filter slots to visible courts only
  const visibleCourtIds = useMemo(() => new Set(visibleCourts.map((c) => c.id)), [visibleCourts]);
  const slots = useMemo(
    () => allSlots.filter((s) => visibleCourtIds.has(s.courtId)),
    [allSlots, visibleCourtIds],
  );

  // Fetch all active rate cards once — build lookup map client-side.
  // Avoids calling useQuery inside .map() (React hooks rules violation).
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

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleAvailableClick = useCallback((slot: Slot) => {
    setSelectedSlotIds((prev) =>
      prev.includes(slot.id)
        ? prev.filter((id) => id !== slot.id)
        : [...prev, slot.id],
    );
  }, []);

  const handleBookedClick = useCallback((slot: Slot) => {
    if (slot.bookingId) setDrawerBookingId(slot.bookingId);
  }, []);

  const handleBranchChange = (id: string) => {
    setBranchId(id);
    setCourtIdFilter('');
    setSportId('');
    setSelectedSlotIds([]);
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setSelectedSlotIds([]);
  };

  const selectedSlots = useMemo(
    () => slots.filter((s) => selectedSlotIds.includes(s.id)),
    [slots, selectedSlotIds],
  );

  const branchName = branches.find((b) => b.id === branchId)?.name ?? '';

  return (
    <>
    <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 6rem)' }}>
      {/* Page header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Reception Dashboard</h2>
          <p className="text-[11px] text-gray-400">
            {branchName
              ? `${branchName} · ${new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}`
              : 'Select a venue to view availability'}
          </p>
        </div>
        <Link href="/bookings"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0">
          All bookings →
        </Link>
      </div>

      {/* Three-panel layout: left 20%, center 55%, right 25% */}
      <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateColumns: '200px 1fr 260px' }}>
        {/* LEFT — filters + status */}
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

        {/* CENTER — multi-court timeline */}
        <BookingTimeline
          slots={slots}
          courts={visibleCourts}
          selectedSlotIds={selectedSlotIds}
          onAvailableClick={handleAvailableClick}
          onBookedClick={handleBookedClick}
          isLoading={slotsLoading && !!branchId}
          date={date}
        />

        {/* RIGHT — booking form */}
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

      {/* Booking detail drawer — rendered outside panels */}
      <BookingDrawer
        bookingId={drawerBookingId}
        onClose={() => setDrawerBookingId(null)}
      />
    </div>
    <RouteDebugPanel routeSegment="booking" />
    </>
  );
}
