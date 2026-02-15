/**
 * EditAgentModal Component Tests
 * Issue: #103 - Edit Agent Modal
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditAgentModal } from '@/components/dashboard/agents/EditAgentModal';
import type { Agent, AgentRole, Capability } from '@/types';

// Mock useToast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockAgent: Agent = {
  id: 'agent-123',
  tenant_id: 'tenant-456',
  name: 'Test Agent',
  role: 'worker' as AgentRole,
  status: 'idle',
  description: 'A test agent for testing',
  capabilities: ['decide', 'escalate'] as Capability[],
  model: 'claude-3-sonnet',
  depth: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  configuration: {
    systemPrompt: 'You are a helpful assistant',
    system_prompt: 'You are a helpful assistant',
  },
  llm_config: {
    provider: 'anthropic',
    model: 'claude-3-sonnet',
    temperature: 0.7,
    max_tokens: 2000,
  },
  limits: {
    max_sub_agents: 10,
    escalation_threshold: 0.7,
    timeout_seconds: 60,
    max_tokens_per_task: 4000,
    max_cost_per_task_usd: 1.0,
  },
};

describe('EditAgentModal', () => {
  const defaultProps = {
    agent: mockAgent,
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(<EditAgentModal {...defaultProps} />);
    expect(screen.getByText('Edit Agent')).toBeInTheDocument();
    expect(screen.getByText(`Update ${mockAgent.name}'s configuration`)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<EditAgentModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Edit Agent')).not.toBeInTheDocument();
  });

  it('does not render when agent is null', () => {
    render(<EditAgentModal {...defaultProps} agent={null} />);
    expect(screen.queryByText('Edit Agent')).not.toBeInTheDocument();
  });

  it('pre-fills form with agent data', () => {
    render(<EditAgentModal {...defaultProps} />);
    
    // Check basic info tab
    const nameInput = screen.getByLabelText('Agent Name *');
    expect(nameInput).toHaveValue(mockAgent.name);
    
    const descriptionInput = screen.getByLabelText('Description *');
    expect(descriptionInput).toHaveValue(mockAgent.description);
  });

  it('allows editing agent name', async () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Agent Name');
    
    expect(nameInput).toHaveValue('Updated Agent Name');
  });

  it('allows editing description', async () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const descriptionInput = screen.getByLabelText('Description *');
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, 'Updated description');
    
    expect(descriptionInput).toHaveValue('Updated description');
  });

  it('allows changing role', async () => {
    render(<EditAgentModal {...defaultProps} />);

    const comboboxes = screen.getAllByRole('combobox');
    const roleTrigger = comboboxes[0]; // Role is the first Select on the form
    fireEvent.click(roleTrigger);

    // Select manager role
    const managerOption = await screen.findByText('Manager');
    fireEvent.click(managerOption);

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Manager');
    });
  });

  it('allows changing model', async () => {
    render(<EditAgentModal {...defaultProps} />);

    const comboboxes = screen.getAllByRole('combobox');
    const modelTrigger = comboboxes[1]; // Model is the second Select on the form
    fireEvent.click(modelTrigger);

    // Select GPT-4
    const gpt4Option = await screen.findByText('GPT-4');
    fireEvent.click(gpt4Option);

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')[1]).toHaveTextContent('GPT-4');
    });
  });

  it('switches to instructions tab', async () => {
    render(<EditAgentModal {...defaultProps} />);

    const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
    await userEvent.click(instructionsTab);

    expect(screen.getByRole('textbox', { name: /instructions/i })).toBeInTheDocument();
  });

  it('allows editing instructions', async () => {
    render(<EditAgentModal {...defaultProps} />);

    const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
    await userEvent.click(instructionsTab);

    const instructionsInput = screen.getByRole('textbox', { name: /instructions/i });
    await userEvent.clear(instructionsInput);
    await userEvent.type(instructionsInput, 'New instructions');

    expect(instructionsInput).toHaveValue('New instructions');
  });

  it('switches to capabilities tab', async () => {
    render(<EditAgentModal {...defaultProps} />);

    const capabilitiesTab = screen.getByRole('tab', { name: /capabilities/i });
    await userEvent.click(capabilitiesTab);

    expect(screen.getByText('Spawn Agents')).toBeInTheDocument();
    expect(screen.getByText('Delegate Tasks')).toBeInTheDocument();
  });

  it('allows toggling capabilities', async () => {
    render(<EditAgentModal {...defaultProps} />);

    const capabilitiesTab = screen.getByRole('tab', { name: /capabilities/i });
    await userEvent.click(capabilitiesTab);

    // Checkboxes have no accessible name; find Spawn Agents checkbox by its position (first)
    const checkboxes = screen.getAllByRole('checkbox');
    const spawnCheckbox = checkboxes[0]; // Spawn Agents is the first capability
    fireEvent.click(spawnCheckbox);

    expect(spawnCheckbox).toBeChecked();
  });

  it('switches to review tab and shows changes', async () => {
    render(<EditAgentModal {...defaultProps} />);

    // Make a change
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Name');

    // Go to review tab
    const reviewTab = screen.getByRole('tab', { name: /review/i });
    await userEvent.click(reviewTab);

    expect(screen.getByText('Changes to be saved:')).toBeInTheDocument();
    // Changed field names are lowercase in the DOM (CSS capitalize for display)
    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('calls onSave with correct data when save button is clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditAgentModal {...defaultProps} onSave={onSave} />);
    
    // Make changes
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Agent Name');
    
    // Click save
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        mockAgent.id,
        expect.objectContaining({
          name: 'Updated Agent Name',
        })
      );
    });
  });

  it('shows validation error when name is empty', async () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.clear(nameInput);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    expect(await screen.findByText('Agent name is required')).toBeInTheDocument();
  });

  it('shows validation error when description is empty', async () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const descriptionInput = screen.getByLabelText('Description *');
    await userEvent.clear(descriptionInput);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    expect(await screen.findByText('Role description is required')).toBeInTheDocument();
  });

  it('shows validation error when no capabilities selected', async () => {
    render(<EditAgentModal {...defaultProps} />);

    const capabilitiesTab = screen.getByRole('tab', { name: /capabilities/i });
    await userEvent.click(capabilitiesTab);

    // Uncheck all capabilities (Radix checkboxes use data-state, not .checked)
    const checkboxes = screen.getAllByRole('checkbox');
    for (const checkbox of checkboxes) {
      if (checkbox.getAttribute('data-state') === 'checked') {
        await userEvent.click(checkbox);
      }
    }

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    // Error appears in both the validation banner and the inline capabilities alert
    const errors = await screen.findAllByText('At least one capability must be selected');
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onOpenChange when cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(<EditAgentModal {...defaultProps} onOpenChange={onOpenChange} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables save button when loading', () => {
    render(<EditAgentModal {...defaultProps} loading={true} />);
    
    const saveButton = screen.getByRole('button', { name: /saving/i });
    expect(saveButton).toBeDisabled();
  });

  it('disables buttons when there are no changes', () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    const discardButton = screen.getByRole('button', { name: /discard changes/i });
    
    expect(saveButton).toBeDisabled();
    expect(discardButton).toBeDisabled();
  });

  it('enables buttons when changes are made', async () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.type(nameInput, ' Updated');
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    const discardButton = screen.getByRole('button', { name: /discard changes/i });
    
    expect(saveButton).not.toBeDisabled();
    expect(discardButton).not.toBeDisabled();
  });

  it('resets form when discard changes is clicked', async () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');
    
    expect(nameInput).toHaveValue('New Name');
    
    const discardButton = screen.getByRole('button', { name: /discard changes/i });
    fireEvent.click(discardButton);
    
    await waitFor(() => {
      expect(nameInput).toHaveValue(mockAgent.name);
    });
  });

  it('shows unsaved changes badge', async () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.type(nameInput, ' Updated');
    
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
  });

  it('displays avatar preview with initials', () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const avatarFallback = screen.getByText('TA'); // Test Agent initials
    expect(avatarFallback).toBeInTheDocument();
  });

  it('updates avatar preview when name changes', async () => {
    render(<EditAgentModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Agent Name');
    
    const avatarFallback = screen.getByText('NA'); // New Agent initials
    expect(avatarFallback).toBeInTheDocument();
  });

  it('includes all editable fields in save payload', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditAgentModal {...defaultProps} onSave={onSave} />);
    
    // Update all fields
    const nameInput = screen.getByLabelText('Agent Name *');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');
    
    const descriptionInput = screen.getByLabelText('Description *');
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, 'New Description');
    
    // Change role
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[0]); // Role is the first Select
    const managerOption = await screen.findByText('Manager');
    fireEvent.click(managerOption);

    // Change model
    const comboboxesAfterRole = screen.getAllByRole('combobox');
    fireEvent.click(comboboxesAfterRole[1]); // Model is the second Select
    const gpt4Option = await screen.findByText('GPT-4');
    fireEvent.click(gpt4Option);
    
    // Update instructions
    const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
    await userEvent.click(instructionsTab);
    const instructionsInput = screen.getByRole('textbox', { name: /instructions/i });
    await userEvent.type(instructionsInput, ' New instructions');

    // Toggle capability
    const capabilitiesTab = screen.getByRole('tab', { name: /capabilities/i });
    await userEvent.click(capabilitiesTab);
    // Spawn Agents is the first checkbox (no accessible name on Radix Checkbox)
    const spawnCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(spawnCheckbox);
    
    // Save
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        mockAgent.id,
        expect.objectContaining({
          name: 'New Name',
          description: 'New Description',
          role: 'manager',
          model: 'gpt-4',
          capabilities: expect.arrayContaining(['spawn', 'decide', 'escalate']),
          configuration: expect.objectContaining({
            systemPrompt: 'You are a helpful assistant New instructions',
            system_prompt: 'You are a helpful assistant New instructions',
          }),
          llm_config: expect.objectContaining({
            provider: 'openai',
            model: 'gpt-4',
          }),
        })
      );
    });
  });
});
