'use client';

import { createContext, useCallback, useContext, useReducer } from 'react';
import { cn } from '@/lib/utils/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id:        string;
  type:      NotificationType;
  title:     string;
  message?:  string;
  durationMs?: number;
}

interface NotificationState {
  notifications: Notification[];
}

type NotificationAction =
  | { type: 'ADD';    payload: Notification }
  | { type: 'REMOVE'; id: string };

function reducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD':
      return { notifications: [...state.notifications, action.payload] };
    case 'REMOVE':
      return { notifications: state.notifications.filter((n) => n.id !== action.id) };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  notify:  (type: NotificationType, title: string, message?: string, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, { notifications: [] });

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const notify = useCallback((
    type:      NotificationType,
    title:     string,
    message?:  string,
    durationMs = 4000,
  ) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: 'ADD', payload: { id, type, title, message, durationMs } });
    if (durationMs > 0) {
      setTimeout(() => dispatch({ type: 'REMOVE', id }), durationMs);
    }
  }, []);

  const typeStyles: Record<NotificationType, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}

      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none"
      >
        {state.notifications.map((n) => (
          <div
            key={n.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-lg border p-4 shadow-lg transition-all',
              typeStyles[n.type],
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{n.title}</p>
                {n.message && <p className="mt-0.5 text-xs opacity-80">{n.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(n.id)}
                className="flex-shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss notification"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
