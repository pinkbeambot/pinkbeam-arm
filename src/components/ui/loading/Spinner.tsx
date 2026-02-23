import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

/**
 * Loading spinner component with configurable size
 * 
 * @example
 * ```tsx
 * <Spinner size="lg" className="text-primary" />
 * ```
 */
export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  )
}

/**
 * Full loading spinner with text for page/section loading states
 * 
 * @example
 * ```tsx
 * <LoadingSpinner text="Loading agents..." />
 * ```
 */
export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner className="text-primary mb-3" size="lg" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

/**
 * Compact spinner for button loading states
 * 
 * @example
 * ```tsx
 * <Button disabled={isLoading}>
 *   {isLoading && <ButtonSpinner />}
 *   Save
 * </Button>
 * ```
 */
export function ButtonSpinner() {
  return <Spinner size="sm" className="mr-2" />
}
