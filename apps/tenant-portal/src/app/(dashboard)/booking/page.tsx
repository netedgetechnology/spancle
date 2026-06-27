'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookingLeftPanel }  from '@/components/booking/booking-left-panel';
import { BookingTimeline }   from '@/components/booking/booking-timeline';
import { BookingPanel }      from '@/components/booking/booking-panel';
import { fetchBranches, branchKeys } from '@/lib/branch.api';
import { fetchCourts, courtKeys }    from '@/lib/court.api';
import { fetchAvailableSlots, slotKeys } from '@/lib/slot.api';
import { fetchRateCard, rateCardKeys }   from '@/lib/rate-card.api';
import type { Slot }  from '@/types/slot.types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingDashboardPage(): React.ReactElement {
  const [branchId,        setBranchId]        = useState('');
  const [courtId,         setCourtId]          = useState('');
  const [date,            setDate]              = useState(today());
  const [selectedSlotIds, setSelectedSlotIds]   = useState<string[]>([]);

  const { data: branches = [] } = useQuery({
    queryKey: branchKeys.list('active'),
    queryFn:  () => fetchBranches('active'),
  });

  const { data: allCourts = [] } = useQuery({
    queryKey: courtKeys.list(branchId ? { branchId } : {}),
    queryFn:  () => fetchCourts(branchId ? { branchId } : undefined),
    enabled:  !!branchId,
  });

  const activeCourts = allCourts.filter((c) => c.status === 'available');
  const court     = activeCourts.find((c) => c.id === courtId) ?? null;
  const courtName = court?.name ?? '';

  const { data: slots = [], isLoading: slotsLoading, refetch } = useQuery({
    queryKey: slotKeys.availability(courtId, date, date),
    queryFn:  () => fetchAvailableSlots({
      courtId,
      branchId,
      from: `${date}T00:00:00.000Z`,
      to:   `${date}T23:59:59.999Z`,
    }),
    enabled: !!courtId && !!branchId && !!date,
    refetchInterval: 30_000,
  });

  const { data: rateCard = null } = useQuery({
    queryKey: rateCardKeys.detail(court?.rateCardId ?? ''),
    queryFn:  () => fetchRateCard(court!.rateCardId!),
    enabled:  !!court?.rateCardId,
  });

  const handleSlotClick = useCallback((slot: Slot) => {
    setSelectedSlotIds((prev) =>
      prev.includes(slot.id)
        ? prev.filter((id) => id !== slot.id)
        : [...prev, slot.id],
    );
  }, []);

  const selectedSlots = slots.filter((s) => selectedSlotIds.includes(s.id));

  const handleCourtChange = (id: string) => {
    setCourtId(id);
    setSelectedSlotIds([]);
  };

  const handleBranchChange = (id: string) => {
    setBranchId(id);
    setCourtId('');
    setSelectedSlotIds([]);
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setSelectedSlotIds([]);
  };

  const branchName = branches.find((b) => b.id === branchId)?.name ?? '';

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Booking Dashboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">Select a court and date, then click available slots</p>
        </div>
        <Link href="/bookings"
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          View all bookings →
        </Link>
      </div>

      <div className="flex-1 min-h-0 grid gap-4" style={{ gridTemplateColumns: '220px 1fr 280px' }}>
        {/* LEFT */}
        <div className="overflow-y-auto">
          <BookingLeftPanel
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            courts={activeCourts.map((c) => ({ id: c.id, name: c.name, rateCardId: c.rateCardId ?? null }))}
            branchId={branchId}
            courtId={courtId}
            date={date}
            onBranchChange={handleBranchChange}
            onCourtChange={handleCourtChange}
            onDateChange={handleDateChange}
            onRefresh={() => void refetch()}
            isRefreshing={slotsLoading}
          />
        </div>

        {/* CENTER */}
        {!courtId ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center p-8">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 mx-auto mb-3">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">Select a venue and court</p>
              <p className="text-xs text-gray-400 mt-1">Available slots will appear here</p>
            </div>
          </div>
        ) : (
          <BookingTimeline
            slots={slots}
            selectedSlotIds={selectedSlotIds}
            onSlotClick={handleSlotClick}
            isLoading={slotsLoading}
            date={date}
          />
        )}

        {/* RIGHT */}
        <BookingPanel
          selectedSlots={selectedSlots}
          branchId={branchId}
          courtId={courtId}
          courtName={courtName}
          branchName={branchName}
          date={date}
          rateCard={rateCard}
          onClear={() => setSelectedSlotIds([])}
          onSuccess={() => { setSelectedSlotIds([]); void refetch(); }}
        />
      </div>
    </div>
  );
}
