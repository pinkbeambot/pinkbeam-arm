'use client';

import * as React from 'react';
import { ThemeProvider } from './ThemeProvider';

interface DesignSystemProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'dark' | 'light' | 'system';
}

/**
 * Design System Provider
 * 
 * Wraps the application with all design system contexts:
 * - ThemeProvider for dark/light mode
 * 
 * Usage:
 * ```tsx
 * <DesignSystemProvider defaultTheme="system">
 *   <App />
 * </DesignSystemProvider>
 * ```
 */
export function DesignSystemProvider({
  children,
  defaultTheme = 'system',
}: DesignSystemProviderProps) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      {children}
    </ThemeProvider>
  );
}
