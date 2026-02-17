import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/use-toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { PerformanceMonitor } from "@/components/performance/PerformanceMonitor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Font display swap for better performance
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap', // Font display swap for better performance
});

export const metadata: Metadata = {
  title: "Pink Beam ARM - Agent Relationship Management",
  description: "The command center for managing AI agent workforces",
  // Performance optimizations
  other: {
    'X-DNS-Prefetch-Control': 'on',
  },
};

/**
 * FOUC Prevention Script
 * Runs before page render to set the correct theme class
 */
const themeInitScript = `
  (function() {
    try {
      const storedTheme = localStorage.getItem('theme');
      let theme = 'light';
      
      if (storedTheme === 'dark' || storedTheme === 'light') {
        theme = storedTheme;
      } else if (storedTheme === 'system' || !storedTheme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      document.documentElement.classList.add(theme);
    } catch (e) {
      // Silent fail if localStorage is unavailable
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
        <PerformanceMonitor />
      </body>
    </html>
  );
}
