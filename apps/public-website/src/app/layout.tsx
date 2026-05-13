import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Spancle Sports OS', template: '%s | Spancle Sports OS' },
  description: 'The enterprise operating system for sports organisations.',
  metadataBase: new URL(process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://spancle.io'),
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
