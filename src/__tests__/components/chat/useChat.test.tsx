/**
 * useChat Hook Tests
 * Issue: #48 - Chat Interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  }),
}));

// Import after mocks
import { useChat, useChats } from '@/lib/hooks/useChat';

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chats: [], messages: [], has_more: false }),
      })
    ) as any;
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useChat({ chatId: null }));
    
    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);
    expect(result.current.chat).toBeNull();
    expect(result.current.sending).toBe(false);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes required functions', async () => {
    const { result } = renderHook(() => useChat({ chatId: null }));
    
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.deleteMessage).toBe('function');
    expect(typeof result.current.loadMore).toBe('function');
  });

  it('handles null chatId gracefully', async () => {
    const { result } = renderHook(() => useChat({ chatId: null }));
    
    await act(async () => {
      await result.current.sendMessage('test');
    });
    
    // Should not throw
    expect(result.current.chat).toBeNull();
  });
});

describe('useChats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chats: [] }),
      })
    ) as any;
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useChats());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.chats).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('exposes refetch function', () => {
    const { result } = renderHook(() => useChats());
    
    expect(typeof result.current.refetch).toBe('function');
  });
});
