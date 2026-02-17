/**
 * Storage Utilities Tests
 * 
 * Tests for localStorage-based performance utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  useStorage,
  useUserPreferences,
  getRecentItems,
  addRecentItem,
  clearRecentItems,
} from '@/lib/performance/storage';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Storage Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStorageItem', () => {
    it('should return parsed value from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ test: 'value' }));
      const result = getStorageItem('test-key', { default: true });
      expect(result).toEqual({ test: 'value' });
    });

    it('should return default value when key not found', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const result = getStorageItem('test-key', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should return default value on parse error', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      const result = getStorageItem('test-key', { default: true });
      expect(result).toEqual({ default: true });
    });
  });

  describe('setStorageItem', () => {
    it('should store serialized value', () => {
      const value = { test: 'value' };
      setStorageItem('test-key', value);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'arm:test-key',
        JSON.stringify(value)
      );
    });

    it('should handle errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      expect(() => setStorageItem('test-key', 'value')).not.toThrow();
    });
  });

  describe('removeStorageItem', () => {
    it('should remove item from localStorage', () => {
      removeStorageItem('test-key');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('arm:test-key');
    });
  });

  describe('useStorage', () => {
    it('should initialize with value from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify('stored-value'));
      const { result } = renderHook(() => useStorage('test', 'default'));
      expect(result.current[0]).toBe('stored-value');
    });

    it('should update localStorage when value changes', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const { result } = renderHook(() => useStorage('test', 'default'));

      act(() => {
        result.current[1]('new-value');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'arm:test',
        JSON.stringify('new-value')
      );
    });

    it('should support function updates', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(1));
      const { result } = renderHook(() => useStorage('counter', 0));

      act(() => {
        result.current[1]((prev: number) => prev + 1);
      });

      expect(result.current[0]).toBe(2);
    });
  });

  describe('useUserPreferences', () => {
    it('should return default preferences', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current[0]).toEqual({
        sidebarCollapsed: false,
        theme: 'system',
        dashboardView: 'grid',
        notificationsEnabled: true,
        chatSoundEnabled: true,
      });
    });

    it('should merge stored preferences', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ theme: 'dark', sidebarCollapsed: false, dashboardView: 'grid', notificationsEnabled: true, chatSoundEnabled: true }));
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current[0].theme).toBe('dark');
      expect(result.current[0].sidebarCollapsed).toBe(false);
    });
  });

  describe('recent items', () => {
    it('should return empty array when no items', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const items = getRecentItems('searches');
      expect(items).toEqual([]);
    });

    it('should add item to recent list', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['item1']));
      addRecentItem('searches', 'item2');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'arm:recent:searches',
        JSON.stringify(['item2', 'item1'])
      );
    });

    it('should deduplicate items', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['item1', 'item2']));
      addRecentItem('searches', 'item1');

      const call = localStorageMock.setItem.mock.calls[0];
      const value = JSON.parse(call[1]);
      expect(value).toEqual(['item1', 'item2']);
    });

    it('should limit to 10 items', () => {
      const existing = Array.from({ length: 10 }, (_, i) => `item${i}`);
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existing));
      addRecentItem('searches', 'new-item');

      const call = localStorageMock.setItem.mock.calls[0];
      const value = JSON.parse(call[1]);
      expect(value.length).toBe(10);
      expect(value[0]).toBe('new-item');
    });

    it('should clear recent items', () => {
      clearRecentItems('searches');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('arm:recent:searches');
    });
  });
});
