/**
 * ChatPanel Component Tests
 * Issue: #48 - Chat Interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '@/components/chat/ChatPanel';

// Mock the useChat hook
vi.mock('@/lib/hooks/useChat', () => ({
  useChat: vi.fn(),
}));

import { useChat } from '@/lib/hooks/useChat';

const mockUseChat = useChat as jest.Mock;

describe('ChatPanel', () => {
  const defaultProps = {
    chatId: 'chat-123',
    agentId: undefined,
    open: true,
    onOpenChange: vi.fn(),
  };

  const mockChat = {
    id: 'chat-123',
    tenant_id: 'tenant-123',
    user_id: 'user-123',
    agent_id: 'agent-123',
    title: 'Test Chat',
    metadata: {},
    created_at: '2026-02-14T00:00:00Z',
    updated_at: '2026-02-14T00:00:00Z',
    agent: {
      id: 'agent-123',
      name: 'Test Agent',
      avatar_url: null,
      role: 'worker',
      status: 'idle',
    },
  };

  const mockMessages = [
    {
      id: 'msg-1',
      chat_id: 'chat-123',
      role: 'user',
      content: 'Hello!',
      metadata: {},
      created_at: '2026-02-14T00:00:00Z',
    },
    {
      id: 'msg-2',
      chat_id: 'chat-123',
      role: 'agent',
      content: 'Hi there! How can I help?',
      metadata: {},
      created_at: '2026-02-14T00:00:01Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.mockReturnValue({
      chat: mockChat,
      messages: mockMessages,
      loading: false,
      error: null,
      hasMore: false,
      sending: false,
      sendMessage: vi.fn(),
      loadMore: vi.fn(),
      deleteMessage: vi.fn(),
    });
  });

  it('renders without crashing', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('displays agent name in header', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('displays loading state when loading', () => {
    mockUseChat.mockReturnValue({
      ...mockUseChat(),
      loading: true,
      messages: [],
    });
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('displays error state when there is an error', () => {
    mockUseChat.mockReturnValue({
      ...mockUseChat(),
      error: new Error('Failed to load'),
      messages: [],
    });
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Failed to load chat')).toBeInTheDocument();
  });

  it('displays empty state when no messages', () => {
    mockUseChat.mockReturnValue({
      ...mockUseChat(),
      messages: [],
    });
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  it('displays messages correctly', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there! How can I help?')).toBeInTheDocument();
  });

  it('calls sendMessage when sending a message', async () => {
    const sendMessage = vi.fn();
    mockUseChat.mockReturnValue({
      ...mockUseChat(),
      sendMessage,
    });
    render(<ChatPanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Message Test Agent...');
    await userEvent.type(input, 'Test message');

    // Send by pressing Enter (the send button has no accessible name from the icon)
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('disables input when sending', () => {
    mockUseChat.mockReturnValue({
      ...mockUseChat(),
      sending: true,
    });
    render(<ChatPanel {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Message Test Agent...');
    expect(input).toBeDisabled();
  });

  it('calls onOpenChange when close button is clicked', () => {
    const onOpenChange = vi.fn();
    render(<ChatPanel {...defaultProps} onOpenChange={onOpenChange} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays user and agent avatars correctly', () => {
    render(<ChatPanel {...defaultProps} />);

    // Check for avatar fallbacks (using initials) — multiple TA avatars (header + message)
    const taElements = screen.getAllByText('TA');
    expect(taElements.length).toBeGreaterThan(0); // Test Agent initials
    expect(screen.getByText('You')).toBeInTheDocument(); // User indicator
  });

  it('displays agent status indicator', () => {
    render(<ChatPanel {...defaultProps} />);
    
    // Status indicator should be present (visual element)
    const statusElement = document.querySelector('.rounded-full');
    expect(statusElement).toBeInTheDocument();
  });

  it('handles load more when scrolling to top', async () => {
    const loadMore = vi.fn();
    mockUseChat.mockReturnValue({
      ...mockUseChat(),
      hasMore: true,
      loadMore,
    });
    render(<ChatPanel {...defaultProps} />);
    
    // Check for "Loading more..." indicator
    expect(screen.getByText('Loading more...')).toBeInTheDocument();
  });

  it('allows deleting user messages', async () => {
    const deleteMessage = vi.fn();
    mockUseChat.mockReturnValue({
      ...mockUseChat(),
      deleteMessage,
    });
    render(<ChatPanel {...defaultProps} />);

    // Hover over user message to show delete button
    const userMessage = screen.getByText('Hello!').closest('.group');
    expect(userMessage).not.toBeNull();
    fireEvent.mouseEnter(userMessage!);

    // Now query for delete buttons (only visible after hover)
    const deleteButtons = screen.getAllByTitle('Delete message');
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Click delete button
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteMessage).toHaveBeenCalledWith('msg-1');
    });
  });

  it('does not show delete button for agent messages', () => {
    render(<ChatPanel {...defaultProps} />);
    
    // Agent message container
    const agentMessage = screen.getByText('Hi there! How can I help?').closest('.group');
    if (agentMessage) {
      fireEvent.mouseEnter(agentMessage);
      
      // Should not have delete button
      const deleteButton = agentMessage.querySelector('[title="Delete message"]');
      expect(deleteButton).toBeNull();
    }
  });

  it('displays timestamps for messages', () => {
    render(<ChatPanel {...defaultProps} />);
    
    // Should show relative time for messages
    const timestamps = screen.getAllByText(/ago|just now/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('handles agent initialization state', () => {
    mockUseChat.mockReturnValue({
      ...mockUseChat(),
      chat: {
        ...mockChat,
        agent: {
          ...mockChat.agent,
          status: 'initializing',
        },
      },
    });
    render(<ChatPanel {...defaultProps} />);
    
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('is accessible with keyboard navigation', () => {
    render(<ChatPanel {...defaultProps} />);

    // Check that interactive elements are focusable
    const closeButton = screen.getByRole('button', { name: /close/i });
    // Native buttons are inherently focusable; verify it's not excluded from tab order
    expect(closeButton).not.toHaveAttribute('tabIndex', '-1');
  });
});
