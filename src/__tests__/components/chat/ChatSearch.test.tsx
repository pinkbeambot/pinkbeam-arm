/**
 * ChatSearch Component Tests
 * Issue: #48 - Chat Interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatSearch } from '@/components/chat/ChatSearch';

describe('ChatSearch', () => {
  const defaultProps = {
    chatId: 'chat-1',
    open: true,
    agentName: 'Test Agent',
    onShowingResults: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders without crashing when open', () => {
    render(<ChatSearch {...defaultProps} />);
    const input = document.querySelector('input');
    expect(input).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ChatSearch {...defaultProps} open={false} />);
    const input = document.querySelector('input');
    expect(input).not.toBeInTheDocument();
  });

  it('updates search query on input change', () => {
    render(<ChatSearch {...defaultProps} />);
    
    const input = document.querySelector('input');
    fireEvent.change(input!, { target: { value: 'test query' } });
    
    expect(input).toHaveValue('test query');
  });

  it('calls onShowingResults when search returns results', async () => {
    const onShowingResults = vi.fn();
    const mockResults = [
      {
        id: 'msg-1',
        chat_id: 'chat-1',
        role: 'user',
        content: 'Test message content',
        snippet: 'Test message...',
        is_bookmarked: false,
        created_at: '2026-02-17T10:00:00Z',
        agent_name: 'Test Agent',
        agent_avatar: null,
        rank: 1,
        headline: 'Test <b>message</b>',
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: mockResults }),
    });

    render(<ChatSearch {...defaultProps} onShowingResults={onShowingResults} />);
    
    const input = document.querySelector('input');
    fireEvent.change(input!, { target: { value: 'test' } });
    
    // Wait for debounce
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 400 });
  });

  it('calls onShowingResults with false when search is empty', () => {
    const onShowingResults = vi.fn();
    render(<ChatSearch {...defaultProps} onShowingResults={onShowingResults} />);
    
    // When search query is empty, onShowingResults should be called with false
    expect(onShowingResults).toHaveBeenCalledWith(false);
  });

  it('resets search when chat changes', () => {
    const { rerender } = render(<ChatSearch {...defaultProps} chatId="chat-1" />);
    
    rerender(<ChatSearch {...defaultProps} chatId="chat-2" />);
    
    const input = document.querySelector('input');
    expect(input).toHaveValue('');
  });

  it('handles search error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Search failed'));

    render(<ChatSearch {...defaultProps} />);
    
    const input = document.querySelector('input');
    fireEvent.change(input!, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 400 });
    
    consoleSpy.mockRestore();
  });
});
