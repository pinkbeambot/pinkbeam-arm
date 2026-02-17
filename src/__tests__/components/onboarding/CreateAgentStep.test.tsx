import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateAgentStep } from '@/components/onboarding/steps/CreateAgentStep';
import { DEFAULT_ONBOARDING_DATA } from '@/components/onboarding/types';

vi.mock('@/lib/constants/models', () => ({
  SUPPORTED_MODELS: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
}));

describe('CreateAgentStep', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnUpdateData = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onBack: mockOnBack,
    onSkip: vi.fn(),
    data: DEFAULT_ONBOARDING_DATA,
    onUpdateData: mockOnUpdateData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render template selection step by default', () => {
    render(<CreateAgentStep {...defaultProps} />);
    expect(screen.getByText('Choose a Template')).toBeInTheDocument();
  });

  it('should render template options', () => {
    render(<CreateAgentStep {...defaultProps} />);
    expect(screen.getByText('Support Agent')).toBeInTheDocument();
    expect(screen.getByText('Content Writer')).toBeInTheDocument();
    expect(screen.getByText('Team Manager')).toBeInTheDocument();
    expect(screen.getByText('Custom Agent')).toBeInTheDocument();
  });

  it('should update data when template is selected', async () => {
    render(<CreateAgentStep {...defaultProps} />);

    fireEvent.click(screen.getByText('Support Agent'));

    await waitFor(() => {
      expect(mockOnUpdateData).toHaveBeenCalled();
    });
  });

  it('should render agent details form after template selection', async () => {
    render(<CreateAgentStep {...defaultProps} />);

    fireEvent.click(screen.getByText('Custom Agent'));

    await waitFor(() => {
      expect(screen.getByText('Agent Details')).toBeInTheDocument();
    });
  });

  it('should have name input field', async () => {
    render(<CreateAgentStep {...defaultProps} />);

    fireEvent.click(screen.getByText('Custom Agent'));

    await waitFor(() => {
      expect(screen.getByLabelText('Agent Name')).toBeInTheDocument();
    });
  });

  it('should show validation error for empty name', async () => {
    render(<CreateAgentStep {...defaultProps} />);

    fireEvent.click(screen.getByText('Custom Agent'));

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    });

    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });
});
