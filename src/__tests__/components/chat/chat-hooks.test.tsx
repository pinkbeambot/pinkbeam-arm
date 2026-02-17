/**
 * Chat Hooks Tests
 * Issue: #48 - Chat Interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoScroll } from '@/components/chat/hooks/useAutoScroll';
import { useBookmarks } from '@/components/chat/hooks/useBookmarks';
import { useExport } from '@/components/chat/hooks/useExport';
import type { ChatMessage } from '@/types';

// ============================================================================
// useAutoScroll Tests
// ============================================================================

describe('useAutoScroll', () => {
  const mockLoadMore = vi.fn();

  const defaultProps = {
    messages: [] as ChatMessage[],
    hasMore: false,
    loading: false,
    loadMore: mockLoadMore,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useAutoScroll(defaultProps));
    
    expect(result.current.autoScroll).toBe(true);
    expect(result.current.showScrollButton).toBe(false);
  });

  it('provides scrollRef', () => {
    const { result } = renderHook(() => useAutoScroll(defaultProps));
    expect(result.current.scrollRef).toBeDefined();
  });

  it('provides handleScroll function', () => {
    const { result } = renderHook(() => useAutoScroll(defaultProps));
    expect(typeof result.current.handleScroll).toBe('function');
  });

  it('provides scrollToBottom function', () => {
    const { result } = renderHook(() => useAutoScroll(defaultProps));
    expect(typeof result.current.scrollToBottom).toBe('function');
  });

  it('provides setAutoScroll function', () => {
    const { result } = renderHook(() => useAutoScroll(defaultProps));
    expect(typeof result.current.setAutoScroll).toBe('function');
  });

  it('updates showScrollButton when scrolled up', () => {
    const { result } = renderHook(() => useAutoScroll(defaultProps));
    
    // Mock scroll element
    const mockDiv = document.createElement('div');
    Object.defineProperty(mockDiv, 'scrollTop', { value: 100, writable: true });
    Object.defineProperty(mockDiv, 'scrollHeight', { value: 500, writable: true });
    Object.defineProperty(mockDiv, 'clientHeight', { value: 300, writable: true });
    
    result.current.scrollRef.current = mockDiv as HTMLDivElement;
    
    act(() => {
      result.current.handleScroll();
    });
    
    expect(result.current.showScrollButton).toBe(true);
    expect(result.current.autoScroll).toBe(false);
  });

  it('calls loadMore when scrolled to top with hasMore', () => {
    const { result } = renderHook(() => useAutoScroll({
      ...defaultProps,
      hasMore: true,
    }));
    
    const mockDiv = document.createElement('div');
    Object.defineProperty(mockDiv, 'scrollTop', { value: 10, writable: true });
    Object.defineProperty(mockDiv, 'scrollHeight', { value: 500, writable: true });
    Object.defineProperty(mockDiv, 'clientHeight', { value: 300, writable: true });
    
    result.current.scrollRef.current = mockDiv as HTMLDivElement;
    
    act(() => {
      result.current.handleScroll();
    });
    
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('does not call loadMore when loading', () => {
    const { result } = renderHook(() => useAutoScroll({
      ...defaultProps,
      hasMore: true,
      loading: true,
    }));
    
    const mockDiv = document.createElement('div');
    Object.defineProperty(mockDiv, 'scrollTop', { value: 10, writable: true });
    Object.defineProperty(mockDiv, 'scrollHeight', { value: 500, writable: true });
    Object.defineProperty(mockDiv, 'clientHeight', { value: 300, writable: true });
    
    result.current.scrollRef.current = mockDiv as HTMLDivElement;
    
    act(() => {
      result.current.handleScroll();
    });
    
    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it('updates autoScroll to true when scrolled to bottom', () => {
    const { result } = renderHook(() => useAutoScroll(defaultProps));
    
    const mockDiv = document.createElement('div');
    Object.defineProperty(mockDiv, 'scrollTop', { value: 450, writable: true });
    Object.defineProperty(mockDiv, 'scrollHeight', { value: 500, writable: true });
    Object.defineProperty(mockDiv, 'clientHeight', { value: 100, writable: true });
    
    result.current.scrollRef.current = mockDiv as HTMLDivElement;
    
    act(() => {
      result.current.handleScroll();
    });
    
    expect(result.current.autoScroll).toBe(true);
    expect(result.current.showScrollButton).toBe(false);
  });

  it('scrollToBottom updates state correctly', () => {
    const { result } = renderHook(() => useAutoScroll(defaultProps));
    
    const mockDiv = document.createElement('div');
    Object.defineProperty(mockDiv, 'scrollTop', { value: 0, writable: true });
    Object.defineProperty(mockDiv, 'scrollHeight', { value: 500, writable: true });
    
    result.current.scrollRef.current = mockDiv as HTMLDivElement;
    
    act(() => {
      result.current.scrollToBottom();
    });
    
    expect(result.current.autoScroll).toBe(true);
    expect(result.current.showScrollButton).toBe(false);
  });
});

// ============================================================================
// useBookmarks Tests
// ============================================================================

describe('useBookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useBookmarks({ chatId: 'chat-1' }));
    
    expect(result.current.showBookmarkedOnly).toBe(false);
    expect(result.current.togglingBookmark.size).toBe(0);
  });

  it('provides required functions', () => {
    const { result } = renderHook(() => useBookmarks({ chatId: 'chat-1' }));
    
    expect(typeof result.current.toggleBookmark).toBe('function');
    expect(typeof result.current.isBookmarked).toBe('function');
    expect(typeof result.current.resetBookmarks).toBe('function');
    expect(typeof result.current.setShowBookmarkedOnly).toBe('function');
  });

  it('isBookmarked returns false by default', () => {
    const { result } = renderHook(() => useBookmarks({ chatId: 'chat-1' }));
    
    const message: ChatMessage = {
      id: 'msg-1',
      chat_id: 'chat-1',
      role: 'user',
      content: 'Test',
      metadata: {},
      created_at: '2026-02-17T10:00:00Z',
    };
    
    expect(result.current.isBookmarked(message)).toBe(false);
  });

  it('isBookmarked returns true when message is bookmarked', () => {
    const { result } = renderHook(() => useBookmarks({ chatId: 'chat-1' }));
    
    const message: ChatMessage = {
      id: 'msg-1',
      chat_id: 'chat-1',
      role: 'user',
      content: 'Test',
      metadata: {},
      is_bookmarked: true,
      created_at: '2026-02-17T10:00:00Z',
    };
    
    expect(result.current.isBookmarked(message)).toBe(true);
  });

  it('resetBookmarks clears state', () => {
    const { result } = renderHook(() => useBookmarks({ chatId: 'chat-1' }));
    
    act(() => {
      result.current.setShowBookmarkedOnly(true);
    });
    
    expect(result.current.showBookmarkedOnly).toBe(true);
    
    act(() => {
      result.current.resetBookmarks();
    });
    
    expect(result.current.showBookmarkedOnly).toBe(false);
  });

  it('toggleBookmark does nothing when chatId is null', async () => {
    const { result } = renderHook(() => useBookmarks({ chatId: null }));
    
    await act(async () => {
      await result.current.toggleBookmark('msg-1', false);
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('toggleBookmark calls API when chatId exists', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    });
    
    const { result } = renderHook(() => useBookmarks({ chatId: 'chat-1' }));
    
    await act(async () => {
      await result.current.toggleBookmark('msg-1', false);
    });
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/chats/chat-1/messages/msg-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ is_bookmarked: true }),
      })
    );
  });

  it('toggleBookmark reverts on API error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    });
    
    const { result } = renderHook(() => useBookmarks({ chatId: 'chat-1' }));
    
    const message: ChatMessage = {
      id: 'msg-1',
      chat_id: 'chat-1',
      role: 'user',
      content: 'Test',
      metadata: {},
      created_at: '2026-02-17T10:00:00Z',
    };
    
    await act(async () => {
      await result.current.toggleBookmark('msg-1', false);
    });
    
    expect(result.current.isBookmarked(message)).toBe(false);
  });

  it('setShowBookmarkedOnly updates state', () => {
    const { result } = renderHook(() => useBookmarks({ chatId: 'chat-1' }));
    
    act(() => {
      result.current.setShowBookmarkedOnly(true);
    });
    
    expect(result.current.showBookmarkedOnly).toBe(true);
  });
});

// ============================================================================
// useExport Tests
// ============================================================================

describe('useExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useExport({ chatId: 'chat-1', showBookmarkedOnly: false }));
    
    expect(result.current.exporting).toBe(false);
  });

  it('provides exportChat function', () => {
    const { result } = renderHook(() => useExport({ chatId: 'chat-1', showBookmarkedOnly: false }));
    
    expect(typeof result.current.exportChat).toBe('function');
  });

  it('does nothing when chatId is null', async () => {
    const { result } = renderHook(() => useExport({ chatId: null, showBookmarkedOnly: false }));
    
    await act(async () => {
      await result.current.exportChat('markdown');
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });

  it('exports as markdown', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('# Chat Export'),
    });
    
    const { result } = renderHook(() => useExport({ chatId: 'chat-1', showBookmarkedOnly: false }));
    
    await act(async () => {
      await result.current.exportChat('markdown');
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/chats/chat-1/export?format=markdown&bookmarked_only=false');
    expect(result.current.exporting).toBe(false);
  });

  it('exports as text', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Chat Export'),
    });
    
    const { result } = renderHook(() => useExport({ chatId: 'chat-1', showBookmarkedOnly: false }));
    
    await act(async () => {
      await result.current.exportChat('text');
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/chats/chat-1/export?format=text&bookmarked_only=false');
    expect(result.current.exporting).toBe(false);
  });

  it('exports as json', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });
    
    const { result } = renderHook(() => useExport({ chatId: 'chat-1', showBookmarkedOnly: false }));
    
    await act(async () => {
      await result.current.exportChat('json');
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/chats/chat-1/export?format=json&bookmarked_only=false');
    expect(result.current.exporting).toBe(false);
  });

  it('exports with bookmarked only filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Bookmarked only'),
    });
    
    const { result } = renderHook(() => useExport({ chatId: 'chat-1', showBookmarkedOnly: true }));
    
    await act(async () => {
      await result.current.exportChat('markdown');
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/chats/chat-1/export?format=markdown&bookmarked_only=true');
  });

  it('handles export errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    });
    
    const { result } = renderHook(() => useExport({ chatId: 'chat-1', showBookmarkedOnly: false }));
    
    await act(async () => {
      await result.current.exportChat('markdown');
    });
    
    expect(result.current.exporting).toBe(false);
    consoleSpy.mockRestore();
  });

  it('sets exporting state during export', async () => {
    let resolveFetch: (value: { ok: boolean; text: () => Promise<string> }) => void;
    const fetchPromise = new Promise<{ ok: boolean; text: () => Promise<string> }>((resolve) => {
      resolveFetch = resolve;
    });
    
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);
    
    const { result } = renderHook(() => useExport({ chatId: 'chat-1', showBookmarkedOnly: false }));
    
    act(() => {
      result.current.exportChat('markdown');
    });
    
    expect(result.current.exporting).toBe(true);
    
    await act(async () => {
      resolveFetch!({ ok: true, text: () => Promise.resolve('') });
      await fetchPromise;
    });
    
    expect(result.current.exporting).toBe(false);
  });
});
