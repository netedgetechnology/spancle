'use client';

import { useEffect } from 'react';
import { ErrorDisplay } from '@/components/ui/error-display';

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SegmentError({ error, reset }: SegmentErrorProps): React.ReactElement {
  useEffect(() => {
    console.error('[SegmentError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <ErrorDisplay
        title="Something went wrong"
        message={error.message || 'An unexpected error occurred.'}
        retry={reset}
        className="max-w-md"
      />
    </div>
  );
}
