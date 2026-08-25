import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Youchao - 承载灵感，原型有巢',
  description: 'Upload, deploy, and collaborate on web prototypes — no servers needed.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon-180.png" />
        <meta name="theme-color" content="#4F46E5" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
