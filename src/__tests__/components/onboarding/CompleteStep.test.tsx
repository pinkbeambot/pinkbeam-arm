import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompleteStep } from '@/components/onboarding/steps/CompleteStep';
import { DEFAULT_ONBOARDING_DATA } from '@/components/onboarding/types';

describe('CompleteStep', () => {
  const mockOnNext = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onBack: undefined,
    onSkip: vi.fn(),
    data: {
      ...DEFAULT_ONBOARDING_DATA,
      agentName: 'My First Agent',
      agentRole: 'worker',
      agentCapabilities: ['decide', 'escalate', 'access_external'],
    },
    onUpdateData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render success title', () => {
    render(<CompleteStep {...defaultProps} />);
    expect(screen.getByText("You're All Set!")).toBeInTheDocument();
  });

  it('should render agent summary with name', () => {
    render(<CompleteStep {...defaultProps} />);
    expect(screen.getByText('My First Agent')).toBeInTheDocument();
  });

  it('should render agent role badge', () => {
    render(<CompleteStep {...defaultProps} />);
    expect(screen.getByText('worker')).toBeInTheDocument();
  });

  it('should render quick start checklist', () => {
    render(<CompleteStep {...defaultProps} />);
    expect(screen.getByText('Quick start checklist')).toBeInTheDocument();
  });

  it('should render checklist items', () => {
    render(<CompleteStep {...defaultProps} />);
    expect(screen.getByText('Account created')).toBeInTheDocument();
    expect(screen.getByText('First agent configured')).toBeInTheDocument();
    expect(screen.getByText('Assign your first task')).toBeInTheDocument();
    expect(screen.getByText('Monitor agent activity')).toBeInTheDocument();
  });

  it('should render next actions grid', () => {
    render(<CompleteStep {...defaultProps} />);
    expect(screen.getByText('Create a Task')).toBeInTheDocument();
    expect(screen.getByText('View All Agents')).toBeInTheDocument();
    expect(screen.getByText('Monitor Activity')).toBeInTheDocument();
    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
  });

  it('should render Start Using ARM button', () => {
    render(<CompleteStep {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Start Using ARM/i })).toBeInTheDocument();
  });

  it('should call onNext when Start Using ARM is clicked', () => {
    render(<CompleteStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Start Using ARM/i }));
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('should render documentation link', () => {
    render(<CompleteStep {...defaultProps} />);
    expect(screen.getByText('documentation')).toBeInTheDocument();
  });
});
