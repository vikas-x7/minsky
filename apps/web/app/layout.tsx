import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { RouteLoader } from '@/components/layout/RouteLoader';
import { QueryProvider } from '@/providers/QueryProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'TicketFlow ',
    template: '%s | TicketFlow',
  },
  description:
    'Book event tickets with dynamic pricing. Prices adjust in real-time based on demand, time, and availability.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex flex-col min-h-screen">
        <QueryProvider>
          <Suspense fallback={null}></Suspense>
          <div className="flex flex-col w-full min-h-screen">
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
