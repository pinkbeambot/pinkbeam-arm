/**
 * Decision Components
 * 
 * A collection of components for displaying and managing agent decisions.
 * 
 * @example
 * ```tsx
 * import { DecisionList, DecisionDetail, ApprovalButtons } from '@/components/decisions';
 * 
 * function MyComponent() {
 *   return (
 *     <DecisionList
 *       decisions={decisions}
 *       agents={agents}
 *       onSelectDecision={handleSelect}
 *     />
 *   );
 * }
 * ```
 */

// Components
export { DecisionCard } from './DecisionCard';
export { DecisionList } from './DecisionList';
export { DecisionDetail } from './DecisionDetail';
export { DecisionFilters } from './DecisionFilters';
export { ApprovalButtons } from './ApprovalButtons';

// Types
export type { DecisionCardProps } from './DecisionCard';
export type { DecisionListProps } from './DecisionList';
export type { DecisionDetailProps } from './DecisionDetail';
export type { 
  DecisionFiltersProps,
  StatusFilter,
  PriorityFilter,
  DateRangeFilter,
  SortField,
  SortOrder,
} from './DecisionFilters';
export type { ApprovalButtonsProps } from './ApprovalButtons';

// Utilities
export { filterDecisions, sortDecisions } from './DecisionFilters';
