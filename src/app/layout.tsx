import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './tailwind-generated.css';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ProtoHost — Share HTML Prototypes in Seconds',
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
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
