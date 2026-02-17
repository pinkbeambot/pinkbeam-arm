export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: 'default' | 'search' | 'error';
  className?: string;
  children?: React.ReactNode;
}

export interface EmptyStateSearchProps extends Omit<EmptyStateProps, 'variant'> {
  variant: 'search';
  searchQuery?: string;
}

export interface EmptyStateErrorProps extends Omit<EmptyStateProps, 'variant'> {
  variant: 'error';
  errorCode?: string;
}
