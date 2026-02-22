import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/use-toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { PerformanceMonitor } from "@/components/performance/PerformanceMonitor";
import { PWAManager } from "@/components/pwa";

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
  // PWA manifest
  manifest: '/manifest.json',
  // App metadata
  applicationName: 'Pink Beam ARM',
  authors: [{ name: 'Pink Beam' }],
  creator: 'Pink Beam',
  publisher: 'Pink Beam',
  // Icons
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
    ],
    shortcut: ['/icons/icon.svg'],
  },
  // Apple web app
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pink Beam ARM',
    startupImage: [
      { url: '/icons/icon-512x512.png', media: '(device-width: 768px)' },
    ],
  },
  // Open Graph
  openGraph: {
    type: 'website',
    siteName: 'Pink Beam ARM',
    title: 'Pink Beam ARM - Agent Relationship Management',
    description: 'The command center for managing AI agent workforces',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Pink Beam ARM',
      },
    ],
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Pink Beam ARM - Agent Relationship Management',
    description: 'The command center for managing AI agent workforces',
    images: ['/icons/icon-512x512.png'],
  },
  // Performance optimizations
  other: {
    'X-DNS-Prefetch-Control': 'on',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  colorScheme: 'light dark',
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
        {/* PWA Icons */}
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="mask-icon" href="/icons/icon.svg" color="#e91e8c" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* Mobile optimizations */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pink Beam ARM" />
        <meta name="application-name" content="Pink Beam ARM" />
        <meta name="msapplication-TileColor" content="#e91e8c" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        {/* PWA Splash Screen for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
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
        <PWAManager />
      </body>
    </html>
  );
}
