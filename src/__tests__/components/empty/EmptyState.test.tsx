import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  EmptyState,
} from '@/components/empty';
import { Users } from 'lucide-react';

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
        secondaryAction={{ label: 'Secondary', onClick: secondaryClick }}
      />
    );

    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
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

  it('should have beam variant class on default action button', () => {
    render(
      <EmptyState
        icon={Users}
        title="No users"
        description="Create your first user"
        action={{ label: 'Create User', onClick: vi.fn() }}
      />
    );

    const button = screen.getByRole('button', { name: 'Create User' });
    // The beam variant applies a gradient from-pink-500 to-pink-600
    expect(button.className).toContain('from-pink-500');
  });
});
