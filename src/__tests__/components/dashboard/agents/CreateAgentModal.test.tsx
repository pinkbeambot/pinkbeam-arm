import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateAgentModal } from '@/components/dashboard/agents/CreateAgentModal';
import type { Agent, CreateAgentInput } from '@/types';

// Mock existing agents for parent selection
const mockExistingAgents: Agent[] = [
  {
    id: 'parent-1',
    tenant_id: 'tenant-1',
    name: 'CEO Agent',
    role: 'ceo',
    status: 'active',
    depth: 0,
    capabilities: ['spawn', 'delegate', 'decide'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'parent-2',
    tenant_id: 'tenant-1',
    name: 'Manager Agent',
    role: 'manager',
    status: 'active',
    depth: 1,
    parent_id: 'parent-1',
    root_id: 'parent-1',
    capabilities: ['spawn', 'delegate', 'decide'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockOnCreate = vi.fn();
const mockOnOpenChange = vi.fn();

describe('CreateAgentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    return render(
      <CreateAgentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
        loading={false}
        existingAgents={mockExistingAgents}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('renders the modal with title', () => {
      renderModal();
      
      expect(screen.getByText('Create New Agent')).toBeInTheDocument();
      expect(screen.getByText('Set up a new AI agent to join your workforce.')).toBeInTheDocument();
    });

    it('renders progress indicator with 5 steps', () => {
      renderModal();
      
      // Should show step numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('starts at template selection step', () => {
      renderModal();
      
      // Template options should be visible
      expect(screen.getByText('SDR Agent')).toBeInTheDocument();
      expect(screen.getByText('Manager Agent')).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('selects a template and proceeds to basic info', () => {
      renderModal();
      
      // Click on SDR Agent template
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      // Should show basic info form
      expect(screen.getByLabelText(/Agent Name/i)).toBeInTheDocument();
    });

    it('pre-fills form data from template selection', () => {
      renderModal();
      
      // Click on Manager template
      const managerTemplate = screen.getByText('Manager Agent').closest('button');
      fireEvent.click(managerTemplate!);
      
      // Should pre-fill role as manager
      expect(screen.getByText('Manager (can spawn agents)')).toBeInTheDocument();
    });
  });

  describe('Basic Info Step', () => {
    const navigateToBasicInfo = () => {
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
    };

    it('renders basic info form fields', () => {
      renderModal();
      navigateToBasicInfo();
      
      expect(screen.getByLabelText(/Agent Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Model/i)).toBeInTheDocument();
    });

    it('updates form data on input change', () => {
      renderModal();
      navigateToBasicInfo();
      
      const nameInput = screen.getByLabelText(/Agent Name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
      
      expect(nameInput).toHaveValue('Test Agent');
    });

    it('requires name and description to proceed', () => {
      renderModal();
      navigateToBasicInfo();
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      
      // Initially disabled (no name/description)
      expect(nextButton).toBeDisabled();
      
      // Fill in name
      const nameInput = screen.getByLabelText(/Agent Name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
      
      // Still disabled (no description)
      expect(nextButton).toBeDisabled();
      
      // Fill in description
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Test description' } });
      
      // Now enabled
      expect(nextButton).not.toBeDisabled();
    });

    it('includes CEO role option', () => {
      renderModal();
      navigateToBasicInfo();
      
      const roleSelect = screen.getByLabelText(/Role/i);
      fireEvent.click(roleSelect);
      
      expect(screen.getByText('CEO (top-level decision maker)')).toBeInTheDocument();
    });
  });

  describe('Hierarchy Step', () => {
    const navigateToHierarchy = () => {
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      // Fill in basic info
      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });
      
      // Click next to go to hierarchy
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    };

    it('renders hierarchy step with parent selection', () => {
      renderModal();
      navigateToHierarchy();
      
      expect(screen.getByText('Parent Agent')).toBeInTheDocument();
      expect(screen.getByLabelText(/Select Parent Agent/i)).toBeInTheDocument();
    });

    it('shows existing agents as parent options', () => {
      renderModal();
      navigateToHierarchy();
      
      const parentSelect = screen.getByLabelText(/Select Parent Agent/i);
      fireEvent.click(parentSelect);
      
      // Should show existing agents
      expect(screen.getByText('CEO Agent')).toBeInTheDocument();
      expect(screen.getByText('Manager Agent')).toBeInTheDocument();
    });

    it('allows selecting no parent (root agent)', () => {
      renderModal();
      navigateToHierarchy();
      
      const parentSelect = screen.getByLabelText(/Select Parent Agent/i);
      fireEvent.click(parentSelect);
      
      expect(screen.getByText('No parent (Root agent)')).toBeInTheDocument();
    });

    it('shows parent agent details when selected', () => {
      renderModal();
      navigateToHierarchy();
      
      // Select a parent
      const parentSelect = screen.getByLabelText(/Select Parent Agent/i);
      fireEvent.click(parentSelect);
      
      const ceoOption = screen.getByText('CEO Agent');
      fireEvent.click(ceoOption);
      
      // Should show parent details
      expect(screen.getByText(/This agent will be created as a child of/)).toBeInTheDocument();
    });

    it('shows empty state when no existing agents', () => {
      render(
        <CreateAgentModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          loading={false}
          existingAgents={[]}
        />
      );
      
      // Navigate to hierarchy step
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      expect(screen.getByText('No existing agents available')).toBeInTheDocument();
      expect(screen.getByText('This will be created as a root-level agent')).toBeInTheDocument();
    });
  });

  describe('Capabilities Step', () => {
    const navigateToCapabilities = () => {
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });
      
      // Skip hierarchy (optional)
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    };

    it('renders capabilities step', () => {
      renderModal();
      navigateToCapabilities();
      
      expect(screen.getByText('Spawn Agents')).toBeInTheDocument();
      expect(screen.getByText('Delegate Tasks')).toBeInTheDocument();
    });

    it('allows toggling capabilities', () => {
      renderModal();
      navigateToCapabilities();
      
      const spawnCheckbox = screen.getByLabelText('Spawn Agents');
      
      // Toggle on
      fireEvent.click(spawnCheckbox);
      expect(spawnCheckbox).toBeChecked();
      
      // Toggle off
      fireEvent.click(spawnCheckbox);
      expect(spawnCheckbox).not.toBeChecked();
    });

    it('requires at least one capability', () => {
      renderModal();
      navigateToCapabilities();
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      
      // Should be enabled (template pre-selects some capabilities)
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Review Step', () => {
    const navigateToReview = () => {
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });
      
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    };

    it('renders review step with agent summary', () => {
      renderModal();
      navigateToReview();
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('shows parent agent in review', () => {
      renderModal();
      navigateToReview();
      
      // Should show parent section (even if none selected)
      expect(screen.getByText('Parent Agent')).toBeInTheDocument();
    });

    it('calls onCreate with correct data when submitted', async () => {
      renderModal();
      navigateToReview();
      
      const createButton = screen.getByRole('button', { name: /create agent/i });
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Agent',
            description: 'Test description',
            role: 'worker',
          })
        );
      });
    });

    it('shows loading state during creation', () => {
      render(
        <CreateAgentModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          loading={true}
          existingAgents={mockExistingAgents}
        />
      );
      
      // Navigate to review
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });
      
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      // Button should show loading state
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('allows going back to previous steps', () => {
      renderModal();
      
      // Go to basic info
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      expect(screen.getByLabelText(/Agent Name/i)).toBeInTheDocument();
      
      // Go back
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      
      // Should be back at template selection
      expect(screen.getByText('SDR Agent')).toBeInTheDocument();
    });

    it('disables back button on first step', () => {
      renderModal();
      
      const backButton = screen.queryByRole('button', { name: /back/i });
      expect(backButton).not.toBeInTheDocument();
    });
  });

  describe('Parent Selection with Existing Agents', () => {
    it('includes parent_id in submission when parent is selected', async () => {
      renderModal();
      
      // Select template
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      // Fill basic info
      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });
      
      // Go to hierarchy and select parent
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      const parentSelect = screen.getByLabelText(/Select Parent Agent/i);
      fireEvent.click(parentSelect);
      
      const ceoOption = screen.getByText('CEO Agent');
      fireEvent.click(ceoOption);
      
      // Navigate through remaining steps
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      // Submit
      const createButton = screen.getByRole('button', { name: /create agent/i });
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Agent',
            parent_id: 'parent-1',
          })
        );
      });
    });

    it('excludes parent_id when no parent is selected', async () => {
      renderModal();
      
      // Select template
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);
      
      // Fill basic info
      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });
      
      // Go to hierarchy and select "No parent"
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      const parentSelect = screen.getByLabelText(/Select Parent Agent/i);
      fireEvent.click(parentSelect);
      
      const noParentOption = screen.getByText('No parent (Root agent)');
      fireEvent.click(noParentOption);
      
      // Navigate through remaining steps
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      // Submit
      const createButton = screen.getByRole('button', { name: /create agent/i });
      fireEvent.click(createButton);
      
      await waitFor(() => {
        const callArg = mockOnCreate.mock.calls[0][0];
        expect(callArg.name).toBe('Test Agent');
        expect(callArg.parent_id).toBeUndefined();
      });
    });
  });
});
