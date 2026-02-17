import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { DEFAULT_ONBOARDING_DATA } from '@/components/onboarding/types';

describe('WelcomeStep', () => {
  const mockOnNext = vi.fn();
  const mockOnSkip = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onBack: undefined,
    onSkip: mockOnSkip,
    data: DEFAULT_ONBOARDING_DATA,
    onUpdateData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render welcome title', () => {
    render(<WelcomeStep {...defaultProps} />);
    expect(screen.getByText('Welcome to Pink Beam ARM')).toBeInTheDocument();
  });

  it('should render Get Started button', () => {
    render(<WelcomeStep {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Get Started/i })).toBeInTheDocument();
  });

  it('should call onNext when Get Started is clicked', () => {
    render(<WelcomeStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('should render skip button for experienced users', () => {
    render(<WelcomeStep {...defaultProps} />);
    expect(screen.getByText('Skip onboarding (experienced users)')).toBeInTheDocument();
  });

  it('should call onSkip when skip button is clicked', () => {
    render(<WelcomeStep {...defaultProps} />);
    fireEvent.click(screen.getByText('Skip onboarding (experienced users)'));
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('should render feature cards', () => {
    render(<WelcomeStep {...defaultProps} />);
    expect(screen.getByText('AI Agents')).toBeInTheDocument();
    expect(screen.getByText('Automation')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('should render value propositions', () => {
    render(<WelcomeStep {...defaultProps} />);
    expect(screen.getByText('No credit card required')).toBeInTheDocument();
    expect(screen.getByText('Free tier includes 3 agents')).toBeInTheDocument();
    expect(screen.getByText('Cancel anytime')).toBeInTheDocument();
  });
});
