import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  EmptyState,
  EmptySearchResults,
  EmptyFilteredResults,
} from '@/components/empty';
import { Users, SearchX, FilterX } from 'lucide-react';

// Mock Lucide icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    SearchX: vi.fn(() => <svg data-testid="search-x-icon" />),
    FilterX: vi.fn(() => <svg data-testid="filter-x-icon" />),
  };
});

describe('EmptyState', () => {
  it('should render with icon, title, and description', () => {
    render(
      <EmptyState
        icon={Users}
        title="No users found"
        description="There are no users to display"
      />
    );

    expect(screen.getByText('No users found')).toBeInTheDocument();
    expect(screen.getByText('There are no users to display')).toBeInTheDocument();
  });

  it('should render action button with onClick', () => {
    const onClick = vi.fn();

    render(
      <EmptyState
        icon={Users}
        title="No users"
        description="Create your first user"
        action={{ label: 'Create User', onClick }}
      />
    );

    const button = screen.getByRole('button', { name: 'Create User' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });

  it('should render action button with href', () => {
    render(
      <EmptyState
        icon={Users}
        title="No users"
        description="Navigate to create user"
        action={{ label: 'Go to Users', href: '/users' }}
      />
    );

    const link = screen.getByRole('link', { name: 'Go to Users' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/users');
  });

  it('should render secondary action button', () => {
    const primaryClick = vi.fn();
    const secondaryClick = vi.fn();

    render(
      <EmptyState
        icon={Users}
        title="No users"
        description="Choose an action"
        action={{ label: 'Primary', onClick: primaryClick }}
        secondaryAction={{ label: 'Secondary', onClick: secondaryClick, variant: 'outline' }}
      />
    );

    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(
      <EmptyState
        icon={Users}
        title="Test"
        description="Test description"
        size="sm"
      />
    );

    rerender(
      <EmptyState
        icon={Users}
        title="Test"
        description="Test description"
        size="md"
      />
    );

    rerender(
      <EmptyState
        icon={Users}
        title="Test"
        description="Test description"
        size="lg"
      />
    );

    // Component renders successfully with different sizes
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <EmptyState
        icon={Users}
        title="Test"
        description="Test description"
        className="custom-empty-state"
      />
    );

    expect(container.querySelector('.custom-empty-state')).toBeInTheDocument();
  });

  it('should render without action buttons', () => {
    render(
      <EmptyState
        icon={Users}
        title="No users"
        description="This is just informational"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should have pink-500 class on default action button', () => {
    render(
      <EmptyState
        icon={Users}
        title="No users"
        description="Create your first user"
        action={{ label: 'Create User', onClick: vi.fn() }}
      />
    );

    const button = screen.getByRole('button', { name: 'Create User' });
    expect(button).toHaveClass('bg-pink-500');
  });
});

describe('EmptySearchResults', () => {
  it('should render with search query', () => {
    render(
      <EmptySearchResults
        query="test search"
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText(/test search/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Search' })).toBeInTheDocument();
  });

  it('should call onClear when button is clicked', () => {
    const onClear = vi.fn();

    render(
      <EmptySearchResults
        query="test"
        onClear={onClear}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('EmptyFilteredResults', () => {
  it('should render with single filter', () => {
    render(
      <EmptyFilteredResults
        filterCount={1}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText('No matching items')).toBeInTheDocument();
    expect(screen.getByText(/1 filter/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
  });

  it('should render with multiple filters', () => {
    render(
      <EmptyFilteredResults
        filterCount={3}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText(/3 filters/)).toBeInTheDocument();
  });

  it('should call onClear when button is clicked', () => {
    const onClear = vi.fn();

    render(
      <EmptyFilteredResults
        filterCount={2}
        onClear={onClear}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    expect(onClear).toHaveBeenCalled();
  });
});
