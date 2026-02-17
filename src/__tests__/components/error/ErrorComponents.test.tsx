import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ErrorFallback } from '@/components/error/ErrorFallback';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  AlertCircle: vi.fn(() => <svg data-testid="alert-icon" />),
  RefreshCw: vi.fn(() => <svg data-testid="refresh-icon" />),
  Home: vi.fn(() => <svg data-testid="home-icon" />),
  Bug: vi.fn(() => <svg data-testid="bug-icon" />),
}));

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="child-content">Normal content</div>;
};

describe('ErrorBoundary', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should catch errors and render fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should not render child content
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    // Console error should have been called
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.any(Object)
    );
  });
});

describe('ErrorFallback', () => {
  const mockError = new Error('Test error message');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title and description', () => {
    render(
      <ErrorFallback
        title="Custom Title"
        description="Custom description"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });

  it('should render default title and description', () => {
    render(<ErrorFallback />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(/We encountered an unexpected error/)
    ).toBeInTheDocument();
  });

  it('should show error details when showDetails is true', () => {
    render(
      <ErrorFallback
        error={mockError}
        showDetails={true}
      />
    );

    // Should show the details summary
    expect(screen.getByText(/Error Details/)).toBeInTheDocument();
  });

  it('should not show error details when showDetails is false', () => {
    render(
      <ErrorFallback
        error={mockError}
        showDetails={false}
      />
    );

    expect(screen.queryByText(/Error Details/)).not.toBeInTheDocument();
  });

  it('should call onReset when Try Again button is clicked', () => {
    const onReset = vi.fn();

    render(
      <ErrorFallback
        error={mockError}
        onReset={onReset}
      />
    );

    const retryButton = screen.getByTestId('error-retry-button');
    fireEvent.click(retryButton);

    expect(onReset).toHaveBeenCalled();
  });

  it('should reload page when Reload Page button is clicked', () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    render(<ErrorFallback error={mockError} />);

    const reloadButton = screen.getByTestId('error-reload-button');
    fireEvent.click(reloadButton);

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should navigate home when Go Home button is clicked', () => {
    const onHome = vi.fn();

    render(
      <ErrorFallback
        error={mockError}
        onHome={onHome}
      />
    );

    const homeButton = screen.getByTestId('error-home-button');
    fireEvent.click(homeButton);

    expect(onHome).toHaveBeenCalled();
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(<ErrorFallback size="sm" />);
    expect(document.querySelector('.max-w-sm')).toBeInTheDocument();

    rerender(<ErrorFallback size="md" />);
    expect(document.querySelector('.max-w-lg')).toBeInTheDocument();

    rerender(<ErrorFallback size="lg" />);
    expect(document.querySelector('.max-w-2xl')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ErrorFallback className="custom-error-class" />
    );

    expect(container.querySelector('.custom-error-class')).toBeInTheDocument();
  });
});
