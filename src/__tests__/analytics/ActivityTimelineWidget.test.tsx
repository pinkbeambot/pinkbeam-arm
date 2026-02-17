import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTimelineWidget } from '@/components/analytics/ActivityTimelineWidget';
import type { ActivityTimelineResponse } from '@/types/analytics';

const mockActivityData = {
  activities: [
    {
      id: '1',
      type: 'task.completed',
      category: 'task',
      title: 'Task completed successfully',
      description: 'Agent finished processing the task',
      timestamp: new Date().toISOString(),
      agentId: 'agent-1',
      agentName: 'Test Agent',
    },
    {
      id: '2',
      type: 'decision.proposed',
      category: 'decision',
      title: 'Decision proposed',
      description: 'Agent proposed a new decision',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      agentId: 'agent-2',
      agentName: 'Manager Agent',
    },
    {
      id: '3',
      type: 'agent.spawned',
      category: 'agent',
      title: 'New agent spawned',
      description: 'A new worker agent was created',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      agentId: 'agent-3',
      agentName: 'Worker Agent',
    },
  ],
  summary: {
    totalEvents: 3,
    eventsByType: { 'task.completed': 1, 'decision.proposed': 1, 'agent.spawned': 1 },
    eventsByCategory: { task: 1, decision: 1, agent: 1 },
  },
};

describe('ActivityTimelineWidget', () => {
  it('renders loading state correctly', () => {
    render(<ActivityTimelineWidget isLoading />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders activity data correctly', () => {
    render(
      <ActivityTimelineWidget
        activities={mockActivityData.activities}
        summary={mockActivityData.summary}
        isLoading={false}
      />
    );
    
    // Check header
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    expect(screen.getByText('3 events')).toBeInTheDocument();
    
    // Check activity titles
    expect(screen.getByText('Task completed successfully')).toBeInTheDocument();
    expect(screen.getByText('Decision proposed')).toBeInTheDocument();
    expect(screen.getByText('New agent spawned')).toBeInTheDocument();
    
    // Check agent names
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Manager Agent')).toBeInTheDocument();
  });

  it('renders empty state when no activities', () => {
    render(
      <ActivityTimelineWidget
        activities={[]}
        summary={{ totalEvents: 0, eventsByType: {}, eventsByCategory: {} }}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('renders activity descriptions', () => {
    render(
      <ActivityTimelineWidget
        activities={mockActivityData.activities}
        summary={mockActivityData.summary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Agent finished processing the task')).toBeInTheDocument();
    expect(screen.getByText('Agent proposed a new decision')).toBeInTheDocument();
  });
});
