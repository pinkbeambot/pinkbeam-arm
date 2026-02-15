import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentHierarchy } from '@/components/agents';
import type { Agent, AgentStatus, AgentRole } from '@/types';

// Mock data
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
  {
    id: '5',
    tenant_id: 'tenant-1',
    parent_id: '2',
    root_id: '1',
    name: 'Worker Agent 2',
    role: 'worker' as AgentRole,
    status: 'paused' as AgentStatus,
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
      // Agent count badge - use getAllByText since stats also show '5'
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
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
      // Values may appear in multiple places (badge + stats), so use getAllByText
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1); // total agents
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // maxDepth + 1
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // root agents
    });

    it('does not render stats when showStats is false', () => {
      render(<AgentHierarchy agents={mockAgents} showStats={false} />);
      
      expect(screen.queryByText('Total Agents')).not.toBeInTheDocument();
    });

    it('renders empty state when no agents', () => {
      render(<AgentHierarchy agents={[]} />);
      
      expect(screen.getByText('No agents in hierarchy')).toBeInTheDocument();
      expect(screen.getByText('Create agents to build your organization')).toBeInTheDocument();
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
      expect(screen.getByText('ceo')).toBeInTheDocument();
    });

    it('displays correct role badges', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);

      expect(screen.getByText('ceo')).toBeInTheDocument();
      // Multiple manager agents exist, so use getAllByText
      expect(screen.getAllByText('manager').length).toBeGreaterThanOrEqual(1);
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
      
      // Should show depth information
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
      render(
        <AgentHierarchy 
          agents={mockAgents} 
          viewMode="tree"
          onSelectAgent={mockOnSelectAgent}
        />
      );
      
      const ceoAgent = screen.getByText('CEO Agent');
      fireEvent.click(ceoAgent);
      
      expect(mockOnSelectAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'CEO Agent',
        })
      );
    });

    it('highlights selected agent', () => {
      render(
        <AgentHierarchy 
          agents={mockAgents} 
          viewMode="tree"
          selectedAgentId="1"
        />
      );
      
      const selectedButton = screen.getByText('CEO Agent').closest('button');
      expect(selectedButton).toHaveClass('border-primary');
    });

    it('switches view modes via buttons', () => {
      render(
        <AgentHierarchy 
          agents={mockAgents}
          viewMode="tree"
          onViewModeChange={mockOnViewModeChange}
        />
      );
      
      const orgButton = screen.getByRole('button', { name: /org/i });
      fireEvent.click(orgButton);
      
      expect(mockOnViewModeChange).toHaveBeenCalledWith('org');
    });

    it('switches to list view', () => {
      render(
        <AgentHierarchy 
          agents={mockAgents}
          viewMode="tree"
          onViewModeChange={mockOnViewModeChange}
        />
      );
      
      const listButton = screen.getByRole('button', { name: /list/i });
      fireEvent.click(listButton);
      
      expect(mockOnViewModeChange).toHaveBeenCalledWith('list');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for status indicators', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);
      
      // Status dots should have aria-label
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Relationships', () => {
    it('correctly identifies parent-child relationships', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);
      
      // Root agent should be visible
      expect(screen.getByText('CEO Agent')).toBeInTheDocument();
      
      // Children should be visible (default expanded)
      expect(screen.getByText('Manager Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Manager Agent 2')).toBeInTheDocument();
    });

    it('calculates correct hierarchy depth', () => {
      render(<AgentHierarchy agents={mockAgents} showStats={true} />);
      
      // Stats should show max depth + 1 = 3 levels
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('View Mode State Management', () => {
    it('uses internal state when onViewModeChange not provided', () => {
      render(<AgentHierarchy agents={mockAgents} viewMode="tree" />);

      // Active view mode button uses "default" variant (bg-primary), not Radix data-state
      expect(screen.getByRole('button', { name: /tree/i })).toHaveClass('bg-primary');
    });

    it('respects controlled viewMode prop', () => {
      const { rerender } = render(
        <AgentHierarchy
          agents={mockAgents}
          viewMode="tree"
          onViewModeChange={mockOnViewModeChange}
        />
      );

      // Active view mode button uses "default" variant (bg-primary)
      expect(screen.getByRole('button', { name: /tree/i })).toHaveClass('bg-primary');

      rerender(
        <AgentHierarchy
          agents={mockAgents}
          viewMode="org"
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByRole('button', { name: /org/i })).toHaveClass('bg-primary');
    });
  });
});
