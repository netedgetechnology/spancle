'use client';

/**
 * QrDisplay
 *
 * Renders the consumer-facing QR / check-in block for a booking.
 *
 * ── Rendering strategy (derived from inspection findings) ────────────────────
 *
 * The backend does NOT generate QR tokens automatically at booking creation.
 * Staff must call POST /qr/issue (ADMIN/MANAGER only).
 * rawToken is returned ONCE at issuance — never stored, never retrievable.
 * Consumer PLAYER role cannot call any issue endpoint.
 *
 * Therefore, the consumer app can display:
 *   A) A rendered QR image  — only if qrContent is provided (IssuedQrToken shape;
 *                             possible in a future consumer-issue endpoint)
 *   B) Token metadata only  — status, expiry, use count (from GET /qr/booking/:id)
 *   C) Check-in instructions — when no token exists or role cannot fetch metadata
 *
 * qrcode.react is installed and used in case A.
 *
 * ── Props ─────────────────────────────────────────────────────────────────────
 *   qrContent     — when provided, renders an actual QR image (future use)
 *   token         — when provided, shows token metadata and status
 *   bookingRef    — always shown as fallback for manual check-in
 *   startsAt      — used for check-in window messaging
 *   isLoading     — skeleton state
 *   onRefresh     — callable when a re-issue mechanism becomes available
 */

import { cn }            from '@/lib/utils/cn';
import { QrStatusBadge } from './qr-status-badge';
import {
  type QrToken,
  type QrAvailability,
  type BookingStatus,
} from '@/types/booking.types';

// Lazy-load qrcode.react to avoid SSR issues
const QRCodeSVG = typeof window !== 'undefined'
  ? (require('qrcode.react') as { QRCodeSVG: React.ComponentType<{ value: string; size: number; bgColor: string; fgColor: string; level: string }> }).QRCodeSVG
  : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const ms  = d.getTime() - now;

  if (ms < 0) return 'Expired';
  if (ms < 60_000) return 'Expires in < 1 min';
  if (ms < 3600_000) return `Expires in ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `Expires in ${Math.floor(ms / 3600_000)}h`;
  return `Expires ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

function deriveAvailability(
  token:         QrToken | null | undefined,
  qrContent:     string | undefined,
  bookingStatus: BookingStatus,
): QrAvailability {
  const qrEligible: BookingStatus[] = ['confirmed', 'checked_in', 'in_progress', 'pending_payment'];
  if (!qrEligible.includes(bookingStatus)) return 'ineligible';
  if (qrContent) return 'has_qr';
  if (token)     return 'token_meta';
  return 'no_token';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface QrDisplayProps {
  bookingRef:    string;
  bookingStatus: BookingStatus;
  startsAt:      string;
  /** When available (future consumer-issue endpoint), renders an actual QR image */
  qrContent?:   string;
  /** Token metadata from GET /qr/booking/:id (admin sessions only) */
  token?:        QrToken | null;
  isLoading?:    boolean;
  /** When wired, shows a "Refresh QR" button */
  onRefresh?:    () => void;
  isRefreshing?: boolean;
  className?:    string;
}

export function QrDisplay({
  bookingRef,
  bookingStatus,
  startsAt,
  qrContent,
  token,
  isLoading,
  onRefresh,
  isRefreshing,
  className,
}: QrDisplayProps): React.ReactElement {
  const availability = deriveAvailability(token, qrContent, bookingStatus);

  if (isLoading) {
    return (
      <div className={cn('rounded-2xl border border-gray-200 bg-white p-5 animate-pulse', className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-40 w-40 rounded-xl bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-48 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white overflow-hidden', className)}>
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <QrIcon className="h-4 w-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-700">Check-in QR</h3>
        </div>
        {token && <QrStatusBadge status={token.status} size="sm" />}
      </div>

      {/* Body */}
      <div className="p-5">
        {availability === 'has_qr' && qrContent && QRCodeSVG ? (
          /* ── A: Render actual QR image ── */
          <QrWithImage
            qrContent={qrContent}
            token={token}
            bookingRef={bookingRef}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        ) : availability === 'token_meta' && token ? (
          /* ── B: Token exists but no image (PLAYER role) ── */
          <TokenMetaView
            token={token}
            bookingRef={bookingRef}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        ) : availability === 'no_token' ? (
          /* ── C: No token yet — show check-in instructions ── */
          <CheckInInstructions bookingRef={bookingRef} startsAt={startsAt} />
        ) : (
          /* ── D: Ineligible booking status ── */
          <IneligibleState bookingStatus={bookingStatus} />
        )}
      </div>
    </div>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function QrWithImage({
  qrContent, token, bookingRef, onRefresh, isRefreshing,
}: {
  qrContent:    string;
  token?:       QrToken | null;
  bookingRef:   string;
  onRefresh?:   () => void;
  isRefreshing?: boolean;
}): React.ReactElement {
  const isExpired = token?.status === 'expired';
  const isRevoked = token?.status === 'revoked';
  const isUsed    = token?.status === 'used';
  const showQr    = !isExpired && !isRevoked;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR image or overlay */}
      <div className={cn('relative rounded-2xl overflow-hidden border-2', showQr ? 'border-gray-100' : 'border-gray-200')}>
        {QRCodeSVG && (
          <QRCodeSVG
            value={qrContent}
            size={192}
            bgColor="#ffffff"
            fgColor={showQr ? '#111827' : '#d1d5db'}
            level="M"
          />
        )}
        {/* Status overlay */}
        {!showQr && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 gap-2">
            <QrStatusBadge status={token?.status ?? 'expired'} showDesc />
          </div>
        )}
      </div>

      {/* Token info */}
      <div className="w-full space-y-1.5 text-center">
        {token?.status === 'active' && (
          <p className="text-xs text-emerald-600 font-medium">{formatExpiry(token.expiresAt)}</p>
        )}
        {isUsed && (
          <p className="text-xs text-blue-600">Check-in complete — used {token?.useCount}/{token?.maxUses}</p>
        )}
        <p className="text-xs text-gray-400">
          Ref: <span className="font-mono">{bookingRef}</span>
        </p>
      </div>

      <CheckInInstructionCard />

      {/* Refresh */}
      {onRefresh && (isExpired || isRevoked) && (
        <RefreshButton onClick={onRefresh} isLoading={isRefreshing} />
      )}
    </div>
  );
}

function TokenMetaView({
  token, bookingRef, onRefresh, isRefreshing,
}: {
  token:        QrToken;
  bookingRef:   string;
  onRefresh?:   () => void;
  isRefreshing?: boolean;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR placeholder (no image — PLAYER role cannot retrieve rawToken) */}
      <div className="flex h-44 w-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 gap-2">
        <QrIcon className="h-10 w-10 text-gray-300" />
        <p className="text-[10px] text-gray-400 text-center px-2">
          QR ready — present to staff
        </p>
      </div>

      {/* Status + expiry */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Status</span>
          <QrStatusBadge status={token.status} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Expires</span>
          <span className="text-xs font-medium text-gray-700">{formatExpiry(token.expiresAt)}</span>
        </div>
        {token.maxUses > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Uses</span>
            <span className="text-xs font-medium text-gray-700">{token.useCount} / {token.maxUses}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Reference</span>
          <span className="text-xs font-mono text-gray-700">{bookingRef}</span>
        </div>
        {token.revokeReason && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-[10px] text-red-600">Revoke reason: {token.revokeReason}</p>
          </div>
        )}
      </div>

      <CheckInInstructionCard />

      {onRefresh && (token.status === 'expired' || token.status === 'revoked') && (
        <RefreshButton onClick={onRefresh} isLoading={isRefreshing} />
      )}
    </div>
  );
}

function CheckInInstructions({ bookingRef, startsAt }: { bookingRef: string; startsAt: string }): React.ReactElement {
  const start = new Date(startsAt);
  const windowOpen = new Date(start.getTime() - 30 * 60_000);
  const windowClose = new Date(start.getTime() + 60 * 60_000);
  // Check-in opens 30 minutes before and closes 60 minutes after session start

  function fmtTime(d: Date): string {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Large icon placeholder */}
      <div className="flex h-44 w-44 flex-col items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 gap-3">
        <svg className="h-12 w-12 text-blue-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75z" />
        </svg>
        <p className="text-xs font-semibold text-blue-600">QR pending</p>
      </div>

      {/* Reference */}
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

function IneligibleState({ bookingStatus }: { bookingStatus: BookingStatus }): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <QrIcon className="h-7 w-7 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">QR not available</p>
        <p className="text-xs text-gray-400 mt-0.5 capitalize">
          Booking is {bookingStatus.replace(/_/g, ' ')}
        </p>
      </div>
    </div>
  );
}

function CheckInInstructionCard({ extraInfo }: { extraInfo?: string }): React.ReactElement {
  return (
    <div className="w-full rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-1.5">
      <p className="text-xs font-semibold text-blue-800">How to check in</p>
      <ul className="space-y-1">
        {[
          'Arrive at the venue reception',
          'Show your booking reference or QR to a staff member',
          'Staff will scan and confirm your session',
        ].map((step) => (
          <li key={step} className="flex items-start gap-1.5 text-[11px] text-blue-700">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" aria-hidden="true" />
            {step}
          </li>
        ))}
      </ul>
      {extraInfo && <p className="text-[10px] text-blue-600 border-t border-blue-100 pt-1.5">{extraInfo}</p>}
    </div>
  );
}

function RefreshButton({ onClick, isLoading }: { onClick: () => void; isLoading?: boolean }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      aria-busy={isLoading}
    >
      <svg className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
      {isLoading ? 'Requesting…' : 'Request new QR'}
    </button>
  );
}

function QrIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    </svg>
  );
}
