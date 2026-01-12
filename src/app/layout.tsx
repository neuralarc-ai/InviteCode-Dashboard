import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PreviewCodesProvider } from "@/contexts/preview-codes-context";
import { AuthProvider } from "@/components/auth-provider";
import { GlobalProvider } from "@/contexts/global-context";

export const metadata: Metadata = {
  title: "CEO Insights",
  description:
    "Dashboard for managing invite codes and waitlist for CEO Insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
                  
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to system preference if localStorage is not available
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        <AuthProvider>
          <PreviewCodesProvider>
            <GlobalProvider>{children}</GlobalProvider>
          </PreviewCodesProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
