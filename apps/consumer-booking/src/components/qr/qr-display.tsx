'use client';

/**
 * qr-display.tsx
 *
 * QrDisplay — consumer-facing QR / check-in block for a booking.
 *
 * Now wired to GET /api/v1/bookings/:bookingId/qr (PLAYER-scoped endpoint
 * added in this sprint). Fetches rawToken + qrContent on mount and renders
 * an actual QR image via qrcode.react.
 *
 * Rendering states:
 *   'loading'   → skeleton
 *   'qr'        → QR image from live qrContent
 *   'ineligible'→ booking status cannot have a QR
 *   'error'     → fetch failed (403 = not owner; 422 = wrong status; 5xx = server)
 *   'no_token'  → should not occur with the new endpoint, but kept as fallback
 *
 * Token refresh: calling refetch() re-issues a new token (old one is revoked).
 * The endpoint handles idempotency — one active token per booking at all times.
 *
 * QR payload generation: NEVER done in the frontend.
 * Signing, hashing, and verification: backend only.
 */

import { useCallback }             from 'react';
import { useQuery }                from '@tanstack/react-query';
import { cn }                      from '@/lib/utils/cn';
import { QrStatusBadge }           from './qr-status-badge';
import { getConsumerQr, consumerQrKeys } from '@/lib/api/qr.api';
import { type BookingStatus, type IssuedQrToken } from '@/types/booking.types';

// Lazy-load qrcode.react — avoids SSR issues
const QRCodeSVG = typeof window !== 'undefined'
  ? (require('qrcode.react') as { QRCodeSVG: React.ComponentType<{ value: string; size: number; bgColor: string; fgColor: string; level: string }> }).QRCodeSVG
  : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0)           return 'Expired';
  if (ms < 60_000)      return 'Expires in < 1 min';
  if (ms < 3_600_000)   return `Expires in ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000)  return `Expires in ${Math.floor(ms / 3_600_000)}h`;
  return `Expires ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

const QR_ELIGIBLE: BookingStatus[] = ['confirmed', 'pending_payment'];

// ── Component ─────────────────────────────────────────────────────────────────

interface QrDisplayProps {
  bookingId:     string;
  bookingRef:    string;
  bookingStatus: BookingStatus;
  startsAt:      string;
  className?:    string;
}

export function QrDisplay({
  bookingId,
  bookingRef,
  bookingStatus,
  startsAt,
  className,
}: QrDisplayProps): React.ReactElement {

  const eligible = QR_ELIGIBLE.includes(bookingStatus);

  const {
    data:       qrData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: consumerQrKeys.forBooking(bookingId),
    queryFn:  () => getConsumerQr(bookingId),
    enabled:  eligible,
    // Don't cache stale tokens — rawToken must be fresh
    staleTime:  0,
    gcTime:     5 * 60_000,
    retry:      (count, err) => {
      // 403 = not owner, 422 = wrong status — do not retry
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 403 || status === 422) return false;
      return count < 2;
    },
  });

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white overflow-hidden', className)}>
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <QrIcon className="h-4 w-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-700">Check-in QR</h3>
        </div>
        {qrData && <QrStatusBadge status="active" size="sm" />}
      </div>

      {/* Body */}
      <div className="p-5">
        {!eligible ? (
          <IneligibleState status={bookingStatus} />
        ) : isLoading || isFetching ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState error={error} bookingRef={bookingRef} onRetry={handleRefresh} />
        ) : qrData ? (
          <QrImageView
            token={qrData}
            bookingRef={bookingRef}
            startsAt={startsAt}
            onRefresh={handleRefresh}
            isRefreshing={isFetching}
          />
        ) : (
          <CheckInInstructions bookingRef={bookingRef} startsAt={startsAt} />
        )}
      </div>
    </div>
  );
}

// ── QR image view ─────────────────────────────────────────────────────────────

function QrImageView({
  token, bookingRef, startsAt, onRefresh, isRefreshing,
}: {
  token:        IssuedQrToken;
  bookingRef:   string;
  startsAt:     string;
  onRefresh:    () => void;
  isRefreshing: boolean;
}): React.ReactElement {
  const start      = new Date(startsAt);
  const windowOpen = new Date(start.getTime() - 30 * 60_000);
  const windowClose = new Date(start.getTime() + 60 * 60_000);

  function fmtTime(d: Date) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  const isExpired = new Date(token.expiresAt) < new Date();

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR image */}
      {QRCodeSVG && (
        <div className={cn(
          'relative rounded-2xl overflow-hidden border-2',
          isExpired ? 'border-gray-200 opacity-50' : 'border-gray-100',
        )}>
          <QRCodeSVG
            value={token.qrContent}
            size={200}
            bgColor="#ffffff"
            fgColor={isExpired ? '#9ca3af' : '#111827'}
            level="M"
          />
          {isExpired && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <QrStatusBadge status="expired" showDesc />
            </div>
          )}
        </div>
      )}

      {/* Token info */}
      <div className="w-full space-y-1.5 text-center">
        {!isExpired ? (
          <p className="text-xs font-medium text-emerald-600">{formatExpiry(token.expiresAt)}</p>
        ) : (
          <p className="text-xs text-gray-400">This QR has expired</p>
        )}
        <p className="text-xs text-gray-400">
          Ref: <span className="font-mono font-medium text-gray-600">{bookingRef}</span>
        </p>
      </div>

      {/* Check-in instructions */}
      <CheckInInstructionCard
        extraInfo={`Check-in window: ${fmtTime(windowOpen)} to ${fmtTime(windowClose)} — 30 minutes before and 60 minutes after session start.`}
      />

      {/* Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-busy={isRefreshing}
        aria-label="Get a new QR code"
      >
        <svg className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        {isRefreshing ? 'Refreshing…' : 'Refresh QR'}
      </button>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({
  error, bookingRef, onRetry,
}: {
  error:      unknown;
  bookingRef: string;
  onRetry:    () => void;
}): React.ReactElement {
  const status = (error as { statusCode?: number })?.statusCode;
  const is403  = status === 403;
  const is422  = status === 422;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Fallback reference card */}
      <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-center">
        <p className="text-[10px] text-gray-400 mb-1">Your booking reference</p>
        <p className="text-lg font-bold font-mono text-gray-900 tracking-wider">{bookingRef}</p>
      </div>

      <div className="w-full rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">
        {is403 ? (
          <p className="text-xs text-amber-800">
            You can only view QR codes for your own bookings.
          </p>
        ) : is422 ? (
          <p className="text-xs text-amber-800">
            QR code is not available for this booking&apos;s current status.
          </p>
        ) : (
          <>
            <p className="text-xs text-amber-800 mb-2">
              Could not load QR code. Show your booking reference at the venue.
            </p>
            <button type="button" onClick={onRetry}
              className="text-xs font-medium text-blue-600 hover:underline">
              Try again
            </button>
          </>
        )}
      </div>

      {!is403 && !is422 && <CheckInInstructionCard />}
    </div>
  );
}

// ── Fallback: check-in instructions (no QR) ───────────────────────────────────

function CheckInInstructions({ bookingRef, startsAt }: { bookingRef: string; startsAt: string }): React.ReactElement {
  const start      = new Date(startsAt);
  const windowOpen = new Date(start.getTime() - 30 * 60_000);
  const windowClose = new Date(start.getTime() + 60 * 60_000);

  function fmtTime(d: Date) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-44 w-44 flex-col items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 gap-3">
        <QrIcon className="h-12 w-12 text-blue-300" />
        <p className="text-xs font-semibold text-blue-500">Loading QR…</p>
      </div>
      <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center">
        <p className="text-[10px] text-gray-400 mb-0.5">Your booking reference</p>
        <p className="text-lg font-bold font-mono text-gray-900 tracking-wider">{bookingRef}</p>
      </div>
      <CheckInInstructionCard
        extraInfo={`Check-in opens at ${fmtTime(windowOpen)} and closes at ${fmtTime(windowClose)}.`}
      />
    </div>
  );
}

// ── Ineligible status ─────────────────────────────────────────────────────────

function IneligibleState({ status }: { status: BookingStatus }): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <QrIcon className="h-7 w-7 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">QR not available</p>
        <p className="text-xs text-gray-400 mt-0.5 capitalize">
          Booking is {status.replace(/_/g, ' ')}
        </p>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 animate-pulse">
      <div className="h-52 w-52 rounded-2xl bg-gray-200" aria-hidden="true" />
      <div className="h-3 w-32 rounded bg-gray-200" aria-hidden="true" />
      <div className="h-3 w-48 rounded bg-gray-100" aria-hidden="true" />
    </div>
  );
}

// ── Shared instruction card ───────────────────────────────────────────────────

function CheckInInstructionCard({ extraInfo }: { extraInfo?: string }): React.ReactElement {
  return (
    <div className="w-full rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-1.5">
      <p className="text-xs font-semibold text-blue-800">How to check in</p>
      <ul className="space-y-1">
        {[
          'Arrive at the venue reception',
          'Show your QR code or booking reference to a staff member',
          'Staff will scan and confirm your session',
        ].map((step) => (
          <li key={step} className="flex items-start gap-1.5 text-[11px] text-blue-700">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" aria-hidden="true" />
            {step}
          </li>
        ))}
      </ul>
      {extraInfo && (
        <p className="text-[10px] text-blue-600 border-t border-blue-100 pt-1.5">{extraInfo}</p>
      )}
    </div>
  );
}

// ── QR icon ───────────────────────────────────────────────────────────────────

function QrIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    </svg>
  );
}
