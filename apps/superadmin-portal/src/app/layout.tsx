import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Spancle Super Admin', template: '%s | Super Admin' },
  description: 'Spancle Sports OS — Platform Administration',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
