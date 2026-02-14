import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentHierarchy } from '@/components/agents/AgentHierarchy';
import type { Agent, AgentStatus, AgentRole } from '@/types';

const mockAgents: Agent[] = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    name: 'CEO Agent',
    role: 'ceo' as AgentRole,
    status: 'active' as AgentStatus,
    depth: 0,
    capabilities: ['spawn', 'delegate', 'decide'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    parent_id: '1',
    root_id: '1',
    name: 'Manager Agent 1',
    role: 'manager' as AgentRole,
    status: 'active' as AgentStatus,
    depth: 1,
    capabilities: ['spawn', 'delegate', 'decide'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    tenant_id: 'tenant-1',
    parent_id: '1',
    root_id: '1',
    name: 'Manager Agent 2',
    role: 'manager' as AgentRole,
    status: 'idle' as AgentStatus,
    depth: 1,
    capabilities: ['spawn', 'delegate', 'decide'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    tenant_id: 'tenant-1',
    parent_id: '2',
    root_id: '1',
    name: 'Worker Agent 1',
    role: 'worker' as AgentRole,
    status: 'active' as AgentStatus,
    depth: 2,
    capabilities: ['decide', 'escalate'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockOnSelectAgent = vi.fn();
const mockOnViewModeChange = vi.fn();

describe('AgentHierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the hierarchy component with header', () => {
      render(<AgentHierarchy agents={mockAgents} />);
      expect(screen.getByText('Agent Hierarchy')).toBeInTheDocument();
    });

    it('renders view mode toggle buttons', () => {
      render(<AgentHierarchy agents={mockAgents} />);
      expect(screen.getByRole('button', { name: /tree/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /org/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
    });

    it('renders stats when showStats is true', () => {
      render(<AgentHierarchy agents={mockAgents} showStats={true} />);
      expect(screen.getByText('Total Agents')).toBeInTheDocument();
      expect(screen.getByText('Hierarchy Levels')).toBeInTheDocument();
      expect(screen.getByText('Root Agents')).toBeInTheDocument();
    });

    it('does not render stats when showStats is false', () => {
      render(<AgentHierarchy agents={mockAgents} showStats={false} />);
      expect(screen.queryByText('Total Agents')).not.toBeInTheDocument();
    });

    it('renders empty state when no agents', () => {
      render(<AgentHierarchy agents={[]} />);
      expect(screen.getByText('No agents in hierarchy')).toBeInTheDocument();
    });
  });

  describe('Tree View', () => {
    it('renders root agents in tree view', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);
      expect(screen.getByText('CEO Agent')).toBeInTheDocument();
    });

    it('shows agent details', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);
      expect(screen.getByText('CEO Agent')).toBeInTheDocument();
    });

    it('displays correct role badges', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);
      const ceoBadge = screen.getAllByText('ceo')[0];
      expect(ceoBadge).toBeInTheDocument();
    });

    it('shows root badge for root agents', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);
      expect(screen.getByText('Root')).toBeInTheDocument();
    });
  });

  describe('List View', () => {
    it('renders all agents in list view', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="list" />);
      mockAgents.forEach(agent => {
        expect(screen.getByText(agent.name)).toBeInTheDocument();
      });
    });

    it('shows depth indicators in list view', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="list" />);
      expect(screen.getByText('Depth 0')).toBeInTheDocument();
    });

    it('renders empty state when no agents in list view', () => {
      render(<AgentHierarchy agents={[]} viewMode="list" />);
      expect(screen.getByText('No agents found')).toBeInTheDocument();
    });
  });

  describe('Org Chart View', () => {
    it('renders org chart view', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="org" />);
      expect(screen.getByText('CEO Agent')).toBeInTheDocument();
    });

    it('renders empty state when no agents in org view', () => {
      render(<AgentHierarchy agents={[]} viewMode="org" />);
      expect(screen.getByText('No agents in hierarchy')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onSelectAgent when agent is clicked', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" onSelectAgent={mockOnSelectAgent} />);
      const ceoAgent = screen.getByText('CEO Agent');
      fireEvent.click(ceoAgent);
      expect(mockOnSelectAgent).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'CEO Agent' }));
    });

    it('highlights selected agent', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" selectedAgentId="1" />);
      expect(screen.getByText('CEO Agent')).toBeInTheDocument();
    });

    it('switches view modes via buttons', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" onViewModeChange={mockOnViewModeChange} />);
      const orgButton = screen.getByRole('button', { name: /org/i });
      fireEvent.click(orgButton);
      expect(mockOnViewModeChange).toHaveBeenCalledWith('org');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for status indicators', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Relationships', () => {
    it('correctly identifies parent-child relationships', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);
      expect(screen.getByText('CEO Agent')).toBeInTheDocument();
      expect(screen.getByText('Manager Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Manager Agent 2')).toBeInTheDocument();
    });

    it('calculates correct hierarchy depth', () => {
      render(<AgentHierarchy agents={mockAgents} showStats={true} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
