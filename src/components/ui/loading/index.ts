/**
 * Loading components index
 * 
 * Use these components for loading states throughout the application.
 * 
 * @example
 * ```tsx
 * // Simple loading spinner
 * <LoadingSpinner text="Loading agents..." />
 * 
 * // Inline spinner
 * <Spinner size="sm" />
 * 
 * // Button loading state
 * <Button disabled={isLoading}>
 *   {isLoading && <ButtonSpinner />}
 *   Save
 * </Button>
 * 
 * // Skeleton loading
 * <Skeleton className="h-4 w-32" />
 * <SkeletonCard />
 * <SkeletonTable />
 * ```
 */

export { Spinner, LoadingSpinner, ButtonSpinner } from './Spinner'
export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonDashboard, 
  SkeletonList 
} from '../skeleton'