import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <div className="space-y-3">
        <p className="text-7xl font-bold text-gray-100 leading-none">404</p>
        <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
