'use client';

/**
 * CancelBookingModal
 *
 * Confirmation dialog for cancelling a booking.
 * Calls PATCH /bookings/:id/cancel.
 * Closes on success and calls onSuccess(updatedBooking).
 */

import { useState }                      from 'react';
import { useMutation, useQueryClient }    from '@tanstack/react-query';
import { cn }                            from '@/lib/utils/cn';
import { cancelBooking, bookingKeys }    from '@/lib/api/booking.api';
import type { Booking }                  from '@/types/booking.types';

interface CancelBookingModalProps {
  booking:   Booking;
  isOpen:    boolean;
  onClose:   () => void;
  onSuccess: (updated: Booking) => void;
}

export function CancelBookingModal({
  booking, isOpen, onClose, onSuccess,
}: CancelBookingModalProps): React.ReactElement | null {
  const qc                           = useQueryClient();
  const [reason, setReason]          = useState('');
  const [validationErr, setValidErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => cancelBooking(booking.id, reason.trim()),
    onSuccess:  (updated) => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all() });
      onSuccess(updated);
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!reason.trim()) { setValidErr('Please provide a cancellation reason.'); return; }
    setValidErr('');
    mutation.mutate();
  };

  // Close on Escape
  if (typeof window !== 'undefined' && isOpen) {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler, { once: true });
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="cancel-modal-title" className="text-sm font-semibold text-gray-900">
            Cancel booking
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{booking.reference}</p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            This action cannot be undone. The booking will be cancelled and any applicable refund
            will be processed per the cancellation policy.
          </p>

          <div>
            <label htmlFor="cancel-reason" className="block text-xs font-medium text-gray-700 mb-1.5">
              Reason for cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setValidErr(''); }}
              rows={3}
              maxLength={500}
              placeholder="e.g. Change of plans, scheduling conflict…"
              className={cn(
                'block w-full rounded-lg border px-3 py-2 text-sm resize-none',
                'focus:outline-none focus:ring-1',
                validationErr
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
              )}
            />
            {validationErr && <p className="mt-1 text-xs text-red-600">{validationErr}</p>}
            <p className="mt-1 text-[10px] text-gray-400">{reason.length}/500</p>
          </div>

          {mutation.isError && (
            <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {(mutation.error as { message?: string })?.message ?? 'Cancellation failed. Please try again.'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            aria-busy={mutation.isPending}
          >
            {mutation.isPending ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
