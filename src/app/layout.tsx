import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/lib/query-provider';
import Sidebar from '@/components/layout/sidebar';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: '뇌동방지턱',
  description: 'OKX 트레이딩 저널 & 대시보드',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-zinc-950 text-zinc-50`}
      >
        <QueryProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8">{children}</main>
          </div>
        </QueryProvider>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
