'use client';

/**
 * PaymentStep
 *
 * Rendered as the final wizard step after booking creation.
 * Wraps Stripe Elements with full PaymentIntent state handling:
 *
 *   succeeded        → navigate to confirmation
 *   processing       → poll with spinner; navigate on webhook-confirmed status
 *   requires_action  → Stripe handles 3DS redirect automatically via confirmPayment
 *   canceled         → show error + retry option (reuses existing booking)
 *   failed / error   → show error + retry option (reuses existing booking)
 *
 * No duplicate bookings on retry — the bookingId is already created; only
 * the payment attempt is retried.
 *
 * Props:
 *   clientSecret   — from POST /payments/initiate
 *   bookingId      — existing booking (not re-created on retry)
 *   bookingRef     — for display
 *   isGuest        — affects confirmation redirect params
 *   guestParams    — guest-specific URL params for confirmation page
 *   onBack         — go back to slot selection step
 */

import { useState, useCallback }                      from 'react';
import { useRouter }                                   from 'next/navigation';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe as StripeType }       from '@stripe/stripe-js';
import { cn }                                          from '@/lib/utils/cn';

// ── Stripe singleton ──────────────────────────────────────────────────────────
// loadStripe is called once at module level — never inside a component.
const stripePromise: Promise<StripeType | null> = loadStripe(
  process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] ?? '',
);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuestConfirmParams {
  ref:    string;
  token?: string;
  qr?:    string;
  email?: string;
}

interface PaymentStepProps {
  clientSecret:  string;
  bookingId:     string;
  bookingRef:    string;
  amountMinor:   number;
  currency:      string;
  isGuest:       boolean;
  guestParams?:  GuestConfirmParams;
  onBack:        () => void;
}

// ── Outer wrapper — provides Elements context ─────────────────────────────────

export function PaymentStep(props: PaymentStepProps): React.ReactElement {
  const { clientSecret } = props;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme:     'stripe',
          variables: {
            colorPrimary:     '#2563eb',  // blue-600
            colorBackground:  '#ffffff',
            colorText:        '#111827',
            borderRadius:     '8px',
            fontFamily:       'inherit',
            fontSizeBase:     '14px',
          },
        },
      }}
    >
      <PaymentForm {...props} />
    </Elements>
  );
}

// ── Inner form — uses useStripe / useElements hooks ───────────────────────────

function PaymentForm({
  bookingId,
  bookingRef,
  amountMinor,
  currency,
  isGuest,
  guestParams,
  onBack,
}: PaymentStepProps): React.ReactElement {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();

  const [status,    setStatus]    = useState<'idle' | 'submitting' | 'processing' | 'error'>('idle');
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);

  // ── Confirmation URL builders ─────────────────────────────────────────────

  const memberConfirmUrl = `/book/confirmation?id=${bookingId}`;
  const guestConfirmUrl  = (() => {
    const p = new URLSearchParams({
      id:    bookingId,
      ref:   guestParams?.ref ?? bookingRef,
      guest: '1',
      ...(guestParams?.token ? { token: guestParams.token } : {}),
      ...(guestParams?.qr    ? { qr:    guestParams.qr    } : {}),
      ...(guestParams?.email ? { email: guestParams.email } : {}),
    });
    return `/book/confirmation?${p.toString()}`;
  })();

  const confirmUrl = isGuest ? guestConfirmUrl : memberConfirmUrl;
  // Stripe redirects here after 3DS; the confirmation page handles the
  // payment_intent query param to detect success.
  const returnUrl  = `${typeof window !== 'undefined' ? window.location.origin : ''}${confirmUrl}&stripe_return=1`;

  // ── Submit handler ────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setStatus('submitting');
    setErrorMsg(null);

    // confirmPayment handles 3DS automatically — redirects the user to
    // Stripe's authentication page if required (requires_action), then
    // back to returnUrl.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',   // only redirect for 3DS; otherwise return result
    });

    if (error) {
      // error.type === 'card_error' | 'validation_error' | 'invalid_request_error'
      setStatus('error');
      setErrorMsg(
        error.type === 'card_error' || error.type === 'validation_error'
          ? (error.message ?? 'Payment failed. Please check your card details.')
          : 'Payment could not be processed. Please try again.',
      );
      return;
    }

    if (!paymentIntent) {
      // redirect: 'if_required' returned without a paymentIntent — user was
      // redirected to 3DS. returnUrl handles the rest.
      return;
    }

    switch (paymentIntent.status) {
      case 'succeeded':
        router.push(confirmUrl);
        break;

      case 'processing':
        // Webhook will confirm the booking asynchronously.
        // Navigate to confirmation — page polls booking status.
        setStatus('processing');
        setTimeout(() => router.push(confirmUrl), 1500);
        break;

      case 'requires_action':
        // confirmPayment with redirect:'if_required' handles this automatically.
        // Should not reach here, but handle gracefully.
        setStatus('error');
        setErrorMsg('Additional verification is required. Please complete the authentication.');
        break;

      case 'canceled':
        setStatus('error');
        setErrorMsg('Payment was canceled. Please try again.');
        break;

      default:
        setStatus('error');
        setErrorMsg('Unexpected payment status. Please contact support.');
    }
  }, [stripe, elements, router, confirmUrl, returnUrl]);

  // ── Format amount for display ─────────────────────────────────────────────

  const formatted = new Intl.NumberFormat('en-GB', {
    style:    'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Complete payment</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Booking reference: <span className="font-mono font-medium text-gray-700">{bookingRef}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Stripe Elements mount point */}
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />

        {/* Error state — retry option preserves the existing booking */}
        {status === 'error' && errorMsg && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm font-medium text-red-800">Payment failed</p>
            <p className="mt-0.5 text-xs text-red-600">{errorMsg}</p>
            <p className="mt-2 text-xs text-gray-500">
              Your booking is held. You can retry with a different card.
            </p>
          </div>
        )}

        {/* Processing state */}
        {status === 'processing' && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
            <svg className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm text-blue-700">Payment is processing…</p>
          </div>
        )}

        {/* Amount + submit */}
        <div className="flex flex-col gap-3 pt-1">
          <button
            type="submit"
            disabled={!stripe || !elements || status === 'submitting' || status === 'processing'}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3',
              'text-sm font-semibold text-white transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              (!stripe || status === 'submitting' || status === 'processing')
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700',
            )}
            aria-busy={status === 'submitting'}
          >
            {status === 'submitting' ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing…
              </>
            ) : (
              `Pay ${formatted}`
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={status === 'submitting' || status === 'processing'}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:underline disabled:opacity-40"
          >
            ← Back to booking
          </button>
        </div>
      </form>

      {/* Security badge */}
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex items-center gap-2">
        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="text-[10px] text-gray-400">
          Payments secured by <span className="font-medium">Stripe</span>. Card details are never stored on our servers.
        </p>
      </div>
    </div>
  );
}
