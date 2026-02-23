import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangeSelector } from '../DateRangeSelector';
import type { DateRange } from '@/types/analytics';

describe('DateRangeSelector', () => {
  const mockDateRange: DateRange = {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-31'),
    preset: '30d',
  };

  it('renders with default preset', () => {
    const onChange = vi.fn();
    render(<DateRangeSelector value={mockDateRange} onChange={onChange} />);
    
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('opens preset dropdown', async () => {
    const onChange = vi.fn();
    render(<DateRangeSelector value={mockDateRange} onChange={onChange} />);
    
    const trigger = screen.getByRole('combobox');
    await userEvent.click(trigger);
    
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
    expect(screen.getByText('Custom...')).toBeInTheDocument();
  });

  it('calls onChange when preset is selected', async () => {
    const onChange = vi.fn();
    render(<DateRangeSelector value={mockDateRange} onChange={onChange} />);
    
    const trigger = screen.getByRole('combobox');
    await userEvent.click(trigger);
    
    const option = screen.getByText('Last 7 days');
    await userEvent.click(option);
    
    expect(onChange).toHaveBeenCalled();
    const callArg = onChange.mock.calls[0][0];
    expect(callArg.preset).toBe('7d');
  });

  it('shows custom date picker when custom selected', async () => {
    const onChange = vi.fn();
    render(<DateRangeSelector value={mockDateRange} onChange={onChange} />);
    
    const trigger = screen.getByRole('combobox');
    await userEvent.click(trigger);
    
    const customOption = screen.getByText('Custom...');
    await userEvent.click(customOption);
    
    // Should show calendar button after selecting custom
    const calendarButton = screen.getByRole('button', { name: /jan/i });
    expect(calendarButton).toBeInTheDocument();
  });
});
