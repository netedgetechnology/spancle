interface RootLayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * RootLayoutWrapper — applies skip-nav and global structure.
 */
export function RootLayoutWrapper({ children }: RootLayoutWrapperProps): React.ReactElement {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-600 focus:shadow"
      >
        Skip to content
      </a>
      {children}
    </>
  );
}
