'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastIntent = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface ToastMessage {
  id:          string;
  title:       string;
  description?: string;
  intent?:     ToastIntent;
  duration?:   number;
  action?:     { label: string; onClick: () => void };
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toast: (message: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback((message: Omit<ToastMessage, 'id'>): void => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...message, id }]);
  }, []);

  const dismiss = React.useCallback((id: string): void => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}

        {messages.map((msg) => (
          <Toast
            key={msg.id}
            message={msg}
            onDismiss={() => dismiss(msg.id)}
          />
        ))}

        <ToastPrimitive.Viewport
          className={cn(
            'fixed bottom-4 right-4 z-[100]',
            'flex flex-col gap-2',
            'w-[380px] max-w-[calc(100vw-2rem)]',
            'outline-none',
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

// ── Intent config ─────────────────────────────────────────────────────────────

const INTENT_CONFIG: Record<
  ToastIntent,
  { icon: React.ElementType; containerClass: string; iconClass: string }
> = {
  success: { icon: CheckCircle,   containerClass: 'border-green-200 bg-green-50', iconClass: 'text-green-500' },
  error:   { icon: AlertCircle,   containerClass: 'border-red-200   bg-red-50',   iconClass: 'text-red-500'   },
  warning: { icon: AlertTriangle, containerClass: 'border-amber-200 bg-amber-50', iconClass: 'text-amber-500' },
  info:    { icon: Info,          containerClass: 'border-blue-200  bg-blue-50',  iconClass: 'text-blue-500'  },
  default: { icon: Info,          containerClass: 'border-gray-200  bg-white',    iconClass: 'text-gray-400'  },
};

// ── Toast item ────────────────────────────────────────────────────────────────

function Toast({
  message,
  onDismiss,
}: {
  message:   ToastMessage;
  onDismiss: () => void;
}): React.ReactElement {
  const intent  = message.intent ?? 'default';
  const config  = INTENT_CONFIG[intent];
  const Icon    = config.icon;

  return (
    <ToastPrimitive.Root
      duration={message.duration ?? 5000}
      onOpenChange={(open) => { if (!open) onDismiss(); }}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-md',
        'data-[state=open]:animate-toast-slide-in',
        'data-[state=closed]:animate-toast-slide-out',
        'data-[swipe=end]:animate-toast-swipe-out',
        config.containerClass,
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', config.iconClass)} aria-hidden="true" />

      <div className="flex-1 space-y-1">
        <ToastPrimitive.Title className="text-sm font-semibold text-gray-900">
          {message.title}
        </ToastPrimitive.Title>
        {message.description && (
          <ToastPrimitive.Description className="text-sm text-gray-600">
            {message.description}
          </ToastPrimitive.Description>
        )}
        {message.action && (
          <ToastPrimitive.Action
            altText={message.action.label}
            asChild
          >
            <button
              type="button"
              onClick={message.action.onClick}
              className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {message.action.label}
            </button>
          </ToastPrimitive.Action>
        )}
      </div>

      <ToastPrimitive.Close
        onClick={onDismiss}
        className={cn(
          'rounded p-0.5 text-gray-400 transition-colors',
          'hover:bg-black/5 hover:text-gray-600',
          'focus:outline-none focus:ring-1 focus:ring-gray-400',
        )}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export { Toast };
