/**
 * session-events.ts
 *
 * A minimal browser event bus that decouples the API transport layer
 * (axios client) from the auth layer (NextAuth session management).
 *
 * The axios client dispatches events; auth hooks and providers listen.
 * Neither layer depends on the other's module at import time, so there
 * are no circular dependencies.
 *
 * Events
 * ──────
 *   'auth:logout-required'
 *     Dispatched by the axios response interceptor when a 401 is received
 *     or when the session carries RefreshAccessTokenError.
 *     Listeners (useSessionGuard / AppProviders) call signOut().
 */

const EVENT_LOGOUT = 'auth:logout-required';

/** Dispatch a logout-required notification to all listeners in this tab. */
export function dispatchLogoutRequired(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(EVENT_LOGOUT));
}

/** Subscribe to logout-required notifications. Returns an unsubscribe fn. */
export function onLogoutRequired(handler: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener(EVENT_LOGOUT, handler);
  return () => { window.removeEventListener(EVENT_LOGOUT, handler); };
}
