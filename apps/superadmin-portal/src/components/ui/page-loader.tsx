import { Spinner } from './spinner';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[400px] flex-col items-center justify-center gap-4"
    >
      <Spinner size="lg" className="text-primary-500" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
