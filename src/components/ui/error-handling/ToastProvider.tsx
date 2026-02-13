'use client'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from 'next-themes'

export function ToastProvider() {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as 'light' | 'dark' | 'system'}
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
        className: 'sonner-toast',
        classNames: {
          error: 'sonner-toast-error',
          success: 'sonner-toast-success',
          warning: 'sonner-toast-warning',
          info: 'sonner-toast-info',
        },
      }}
    />
  )
}

// Re-export toast functions for convenience
export { toast } from 'sonner'
