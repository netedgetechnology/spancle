interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

/**
 * AuthLayout — centered card shell for all auth screens.
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-primary-600">Spancle</span>
          {title && <h2 className="mt-4 text-xl font-semibold text-gray-900">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
