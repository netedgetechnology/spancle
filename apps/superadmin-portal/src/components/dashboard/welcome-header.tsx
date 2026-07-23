'use client';

/**
 * WelcomeHeader — personalised greeting card at the top of the dashboard.
 *
 * Shows:
 *   - Greeting derived from time of day
 *   - Current user's display name
 *   - Platform title ("Spancle Sports OS")
 *   - Current date in locale-aware format
 *
 * No business data. No API calls.
 * Date is computed client-side on mount (avoids SSR hydration mismatch).
 */

import { useState, useEffect } from 'react';
import { useCurrentUser }      from '@/hooks/auth.hooks';

interface WelcomeHeaderProps {
  platformTitle?: string;
  className?:     string;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function WelcomeHeader({
  platformTitle = 'Spancle Sports OS',
  className,
}: WelcomeHeaderProps): React.ReactElement {
  const user = useCurrentUser();
  // Mount guard — avoids SSR/client hydration mismatch for date + greeting
  const [mounted, setMounted]     = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(formatDate(new Date()));
  }, []);

  const displayName = user?.name ?? user?.email ?? 'Admin';

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mounted ? `${greeting()}, ${displayName.split(' ')[0]}` : platformTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{platformTitle}</p>
        </div>

        {mounted && currentDate && (
          <time
            dateTime={new Date().toISOString().slice(0, 10)}
            className="text-sm text-gray-400 whitespace-nowrap"
          >
            {currentDate}
          </time>
        )}
      </div>
    </div>
  );
}
