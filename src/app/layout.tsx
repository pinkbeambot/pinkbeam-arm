import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/use-toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pink Beam ARM - Agent Relationship Management",
  description: "The command center for managing AI agent workforces",
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
      </body>
    </html>
  );
}
