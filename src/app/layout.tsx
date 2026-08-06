import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import './tailwind-generated.css';
import { Toaster } from 'sonner';

const IntroSplashWrapper = dynamic(
  () => import('@/components/intro/IntroSplashWrapper'),
  { ssr: false, loading: () => null }
);

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Youchao — 承载灵感，原型有巢',
  description: 'Upload, deploy, and collaborate on web prototypes — no servers needed.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <IntroSplashWrapper />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
