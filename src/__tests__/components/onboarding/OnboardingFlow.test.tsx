import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

vi.mock('@/lib/hooks/useTenant', () => ({
  useTenant: vi.fn(() => ({
    tenantId: 'tenant-123',
  })),
}));

vi.mock('@/lib/hooks/useAgents', () => ({
  useCreateAgent: vi.fn(() => ({
    createAgent: vi.fn(),
    loading: false,
  })),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}));

describe('OnboardingFlow', () => {
  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <OnboardingFlow
        isOpen={false}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.queryByText('Welcome to Pink Beam ARM')).not.toBeInTheDocument();
  });

  it('should render welcome step when isOpen is true', () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('Welcome to Pink Beam ARM')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('should show skip option in footer', () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('Skip tour')).toBeInTheDocument();
  });

  it('should call onSkip when skip button is clicked', async () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    fireEvent.click(screen.getByText('Skip tour'));
    
    // Wait for async handleSkip to complete
    await waitFor(() => {
      expect(mockOnSkip).toHaveBeenCalled();
    });
  });

  it('should render progress indicator', () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress component renders as a div with bg-secondary class
    expect(document.querySelector('[class*="bg-secondary"]')).toBeInTheDocument();
  });

  it('should render step indicators', () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    const stepIndicators = screen.getAllByLabelText(/Go to step \d/);
    expect(stepIndicators).toHaveLength(4);
  });

  it('should advance to next step when Get Started is clicked', async () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    fireEvent.click(screen.getByText('Get Started'));

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });
  });

  it('should display value propositions on welcome step', () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('No credit card required')).toBeInTheDocument();
    expect(screen.getByText('Free tier includes 3 agents')).toBeInTheDocument();
    expect(screen.getByText('Cancel anytime')).toBeInTheDocument();
  });
});
