/**
 * Local Storage Utilities
 * 
 * Type-safe localStorage wrapper with JSON serialization.
 * Used for caching user preferences and non-sensitive data.
 */

import { useCallback, useState, useEffect } from 'react';

// Storage key prefix to avoid collisions
const STORAGE_PREFIX = 'arm:';

/**
 * Get an item from localStorage with type safety.
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
  }
  return defaultValue;
}

/**
 * Set an item in localStorage with type safety.
 */
export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
  }
}

/**
 * Remove an item from localStorage.
 */
export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.warn(`Error removing localStorage key "${key}":`, error);
  }
}

/**
 * Hook to sync state with localStorage.
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => getStorageItem(key, defaultValue));

  useEffect(() => {
    setStorageItem(key, state);
  }, [key, state]);

  const setStoredValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' 
          ? (value as (prev: T) => T)(prev) 
          : value;
        return next;
      });
    },
    []
  );

  return [state, setStoredValue];
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

interface UserPreferences {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  dashboardView: 'grid' | 'list';
  notificationsEnabled: boolean;
  chatSoundEnabled: boolean;
}

const defaultPreferences: UserPreferences = {
  sidebarCollapsed: false,
  theme: 'system',
  dashboardView: 'grid',
  notificationsEnabled: true,
  chatSoundEnabled: true,
};

export function useUserPreferences() {
  return useStorage<UserPreferences>('preferences', defaultPreferences);
}

// ============================================================================
// CHAT PREFERENCES
// ============================================================================

interface ChatPreferences {
  fontSize: 'small' | 'medium' | 'large';
  showTimestamps: boolean;
  compactMode: boolean;
}

const defaultChatPreferences: ChatPreferences = {
  fontSize: 'medium',
  showTimestamps: true,
  compactMode: false,
};

export function useChatPreferences() {
  return useStorage<ChatPreferences>('chat-preferences', defaultChatPreferences);
}

// ============================================================================
// RECENT ITEMS
// ============================================================================

const MAX_RECENT_ITEMS = 10;

export function getRecentItems(key: string): string[] {
  return getStorageItem<string[]>(`recent:${key}`, []);
}

export function addRecentItem(key: string, item: string): void {
  const items = getRecentItems(key);
  const filtered = items.filter((i) => i !== item);
  const updated = [item, ...filtered].slice(0, MAX_RECENT_ITEMS);
  setStorageItem(`recent:${key}`, updated);
}

export function clearRecentItems(key: string): void {
  removeStorageItem(`recent:${key}`);
}
