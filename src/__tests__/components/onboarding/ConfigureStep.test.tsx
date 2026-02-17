import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigureStep } from '@/components/onboarding/steps/ConfigureStep';
import { DEFAULT_ONBOARDING_DATA } from '@/components/onboarding/types';
import type { AgentRole, Capability } from '@/types';

describe('ConfigureStep', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnUpdateData = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onBack: mockOnBack,
    onSkip: vi.fn(),
    data: {
      ...DEFAULT_ONBOARDING_DATA,
      agentName: 'Test Agent',
      agentRole: 'worker' as AgentRole,
      agentModel: 'claude-3-sonnet',
    },
    onUpdateData: mockOnUpdateData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render configuration title', () => {
    render(<ConfigureStep {...defaultProps} />);
    expect(screen.getByText('Quick Configuration')).toBeInTheDocument();
  });

  it('should render agent summary card with name', () => {
    render(<ConfigureStep {...defaultProps} />);
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('should render configuration options', () => {
    render(<ConfigureStep {...defaultProps} />);
    expect(screen.getByText('Auto-accept Tasks')).toBeInTheDocument();
    expect(screen.getByText('Auto-escalate Errors')).toBeInTheDocument();
    expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
    expect(screen.getByText('Verbose Logging')).toBeInTheDocument();
  });

  it('should have toggle switches for each option', () => {
    render(<ConfigureStep {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(4);
  });

  it('should have task timeout slider', () => {
    render(<ConfigureStep {...defaultProps} />);
    expect(screen.getByText('Task Timeout')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('should have confidence threshold slider', () => {
    render(<ConfigureStep {...defaultProps} />);
    expect(screen.getByText('Confidence Threshold')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', () => {
    render(<ConfigureStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should call onNext when Create Agent button is clicked', () => {
    render(<ConfigureStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Create Agent/i }));
    expect(mockOnNext).toHaveBeenCalled();
  });
});
