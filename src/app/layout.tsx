import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { PreviewCodesProvider } from '@/contexts/preview-codes-context';
import { AuthProvider } from '@/components/auth-provider';

export const metadata: Metadata = {
  title: 'Neon Access',
  description: 'Dashboard for managing invite codes and waitlist for Neon Access.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        <AuthProvider>
          <PreviewCodesProvider>
            {children}
          </PreviewCodesProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
