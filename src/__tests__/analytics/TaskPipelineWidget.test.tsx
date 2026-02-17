import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskPipelineWidget } from '@/components/analytics/TaskPipelineWidget';
import type { TaskPipelineResponse } from '@/types/analytics';

const mockPipelineData = {
  stages: [
    { name: 'Created', count: 100, percentage: 100 },
    { name: 'In Progress', count: 75, percentage: 75, dropOffCount: 25, dropOffPercentage: 25 },
    { name: 'Review', count: 60, percentage: 60, dropOffCount: 15, dropOffPercentage: 15 },
    { name: 'Completed', count: 50, percentage: 50, dropOffCount: 10, dropOffPercentage: 10 },
  ],
  statusBreakdown: [
    { status: 'queued', count: 10, percentage: 10 },
    { status: 'in_progress', count: 15, percentage: 15 },
    { status: 'completed', count: 50, percentage: 50 },
    { status: 'failed', count: 5, percentage: 5 },
  ],
  summary: {
    totalTasks: 100,
    completedTasks: 50,
    failedTasks: 5,
    inProgressTasks: 15,
    avgCompletionTime: 25.5,
    completionRate: 90.9,
  },
};

describe('TaskPipelineWidget', () => {
  it('renders loading state correctly', () => {
    render(<TaskPipelineWidget isLoading />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders pipeline data correctly', () => {
    render(
      <TaskPipelineWidget
        stages={mockPipelineData.stages}
        statusBreakdown={mockPipelineData.statusBreakdown}
        summary={mockPipelineData.summary}
        isLoading={false}
      />
    );
    
    // Check header
    expect(screen.getByText('Task Pipeline')).toBeInTheDocument();
    expect(screen.getByText('100 total tasks')).toBeInTheDocument();
    
    // Check completion rate
    expect(screen.getByText('91%')).toBeInTheDocument();
    
    // Check stage names
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    
    // Check drop-off info
    expect(screen.getByText('25 drop-off (25%)')).toBeInTheDocument();
  });

  it('renders status breakdown', () => {
    render(
      <TaskPipelineWidget
        stages={mockPipelineData.stages}
        statusBreakdown={mockPipelineData.statusBreakdown}
        summary={mockPipelineData.summary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument();
    expect(screen.getByText('queued')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('renders summary stats', () => {
    render(
      <TaskPipelineWidget
        stages={mockPipelineData.stages}
        statusBreakdown={mockPipelineData.statusBreakdown}
        summary={mockPipelineData.summary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    
    expect(screen.getByText('Avg Time')).toBeInTheDocument();
    expect(screen.getByText('26m')).toBeInTheDocument();
  });
});
