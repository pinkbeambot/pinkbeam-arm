/**
 * ChatMessageBubble Component Tests
 * Issue: #48 - Chat Interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import type { ChatMessage } from '@/types';

describe('ChatMessageBubble', () => {
  const mockMessage: ChatMessage = {
    id: 'msg-1',
    chat_id: 'chat-1',
    role: 'user',
    content: 'Hello, this is a test message',
    metadata: {},
    created_at: '2026-02-17T10:00:00Z',
  };

  const defaultProps = {
    message: mockMessage,
    isUser: true,
    agentName: 'Test Agent',
    agentAvatar: undefined,
    showAvatar: true,
    isBookmarked: false,
    isTogglingBookmark: false,
    onToggleBookmark: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatMessageBubble {...defaultProps} />);
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });

  it('displays user message with "You" avatar', () => {
    render(<ChatMessageBubble {...defaultProps} />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('displays agent message with agent initials', () => {
    render(<ChatMessageBubble {...defaultProps} isUser={false} />);
    expect(screen.getByText('TA')).toBeInTheDocument();
  });

  it('displays message content', () => {
    render(<ChatMessageBubble {...defaultProps} />);
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });

  it('displays timestamp', () => {
    render(<ChatMessageBubble {...defaultProps} />);
    expect(screen.getByText(/ago|just now/)).toBeInTheDocument();
  });

  it('calls onToggleBookmark when bookmark button clicked', () => {
    const onToggleBookmark = vi.fn();
    render(<ChatMessageBubble {...defaultProps} onToggleBookmark={onToggleBookmark} isBookmarked={true} />);
    
    const bookmarkButton = screen.getByTitle('Remove bookmark');
    fireEvent.click(bookmarkButton);
    
    expect(onToggleBookmark).toHaveBeenCalled();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<ChatMessageBubble {...defaultProps} onDelete={onDelete} />);
    
    const messageContainer = screen.getByText('Hello, this is a test message').closest('.group');
    fireEvent.mouseEnter(messageContainer!);
    
    const deleteButton = screen.getByTitle('Delete message');
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalled();
  });

  it('does not show delete button for agent messages', () => {
    render(<ChatMessageBubble {...defaultProps} isUser={false} />);
    
    const deleteButton = screen.queryByTitle('Delete message');
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('shows avatar only when showAvatar is true', () => {
    const { rerender } = render(<ChatMessageBubble {...defaultProps} showAvatar={true} />);
    expect(screen.getByText('You')).toBeInTheDocument();

    rerender(<ChatMessageBubble {...defaultProps} showAvatar={false} />);
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });

  it('renders markdown content correctly', () => {
    const markdownMessage: ChatMessage = {
      ...mockMessage,
      content: '**Bold text**',
    };
    
    render(<ChatMessageBubble {...defaultProps} message={markdownMessage} />);
    
    const content = screen.getByText((content) => content.includes('Bold text'));
    expect(content).toBeInTheDocument();
  });

  it('renders inline code correctly', () => {
    const inlineCodeMessage: ChatMessage = {
      ...mockMessage,
      content: 'Use `console.log()` for debugging',
    };
    
    render(<ChatMessageBubble {...defaultProps} message={inlineCodeMessage} />);
    expect(screen.getByText('console.log()')).toBeInTheDocument();
  });

  it('renders lists correctly', () => {
    const listMessage: ChatMessage = {
      ...mockMessage,
      content: '- Item 1\n- Item 2',
    };
    
    render(<ChatMessageBubble {...defaultProps} message={listMessage} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('shows bookmark button when bookmarked', () => {
    render(<ChatMessageBubble {...defaultProps} isBookmarked={true} />);
    
    const bookmarkButton = screen.getByTitle('Remove bookmark');
    expect(bookmarkButton).toBeInTheDocument();
  });

  it('disables bookmark button while toggling', () => {
    render(<ChatMessageBubble {...defaultProps} isBookmarked={true} isTogglingBookmark={true} />);
    
    const bookmarkButton = screen.getByTitle('Remove bookmark');
    expect(bookmarkButton).toBeDisabled();
  });

  it('has correct alignment for user vs agent messages', () => {
    const { rerender, container } = render(<ChatMessageBubble {...defaultProps} isUser={true} />);
    
    expect(container.innerHTML).toContain('flex-row-reverse');

    rerender(<ChatMessageBubble {...defaultProps} isUser={false} />);
    
    expect(container.innerHTML).toContain('flex-row');
  });
});
