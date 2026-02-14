'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

interface DesignSystemProviderProps {
  children: ReactNode;
  defaultTheme?: string;
}

export function DesignSystemProvider({ 
  children, 
  defaultTheme = 'system' 
}: DesignSystemProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
