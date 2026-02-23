import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateAgentModal } from '@/components/dashboard/agents/CreateAgentModal';
import type { CreateAgentInput } from '@/types';

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

    it('renders progress indicator with 4 steps', () => {
      renderModal();

      // Should show step numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
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
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
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

    it('includes system role option', () => {
      renderModal();
      navigateToBasicInfo();

      // Find the Role label, then locate the select trigger in the same section
      const roleLabel = screen.getByText('Role');
      const roleSection = roleLabel.closest('.space-y-2');
      const roleSelectTrigger = roleSection!.querySelector('button[role="combobox"]') as HTMLElement;
      fireEvent.click(roleSelectTrigger);

      expect(screen.getByText('System (infrastructure)')).toBeInTheDocument();
    });
  });

  describe('Capabilities Step', () => {
    const navigateToCapabilities = () => {
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);

      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });

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

      // Find the "Spawn Agents" capability wrapper and its checkbox
      const spawnLabel = screen.getByText('Spawn Agents');
      const spawnWrapper = spawnLabel.closest('.flex.items-start');
      const spawnCheckbox = spawnWrapper!.querySelector('button[role="checkbox"]') as HTMLElement;

      // SDR template does not include 'spawn' by default, so it should be unchecked
      expect(spawnCheckbox).toHaveAttribute('aria-checked', 'false');

      // Toggle on by clicking the wrapper div
      fireEvent.click(spawnWrapper!);
      expect(spawnCheckbox).toHaveAttribute('aria-checked', 'true');

      // Toggle off
      fireEvent.click(spawnWrapper!);
      expect(spawnCheckbox).toHaveAttribute('aria-checked', 'false');
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
    };

    it('renders review step with agent summary', () => {
      renderModal();
      navigateToReview();

      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('shows template name in review', () => {
      renderModal();
      navigateToReview();

      expect(screen.getByText('SDR Agent')).toBeInTheDocument();
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
      const { rerender } = render(
        <CreateAgentModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          loading={false}
        />
      );

      // Navigate to review (loading=false so Next buttons are clickable)
      const sdrTemplate = screen.getByText('SDR Agent').closest('button');
      fireEvent.click(sdrTemplate!);

      fireEvent.change(screen.getByLabelText(/Agent Name/i), { target: { value: 'Test Agent' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      // Re-render with loading=true to simulate creation in progress
      rerender(
        <CreateAgentModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          loading={true}
        />
      );

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
});
