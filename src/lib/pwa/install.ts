/**
 * PWA Installation Utilities
 * Handles the beforeinstallprompt event and installation flow
 */

import { useEffect, useState, useCallback } from 'react';

// Extend Window interface for iOS standalone detection
declare global {
  interface Window {
    deferredInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface InstallPromptState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

/**
 * Check if the app is installed (standalone mode)
 */
export function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && 
     (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

/**
 * Check if device is iOS
 */
export function checkIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Check if device is Android
 */
export function checkAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /android/.test(userAgent);
}

/**
 * Check if device is mobile
 */
export function checkMobile(): boolean {
  return checkIOS() || checkAndroid();
}

/**
 * Trigger the install prompt
 */
export async function triggerInstall(
  deferredPrompt: BeforeInstallPromptEvent
): Promise<{ outcome: 'accepted' | 'dismissed' }> {
  if (!deferredPrompt) {
    throw new Error('No deferred prompt available');
  }

  // Show the prompt
  deferredPrompt.prompt();

  // Wait for user response
  const choiceResult = await deferredPrompt.userChoice;
  
  console.log('[PWA] Install prompt result:', choiceResult.outcome);
  
  return { outcome: choiceResult.outcome };
}

/**
 * Dismiss the install prompt
 */
export function dismissInstallPrompt(): void {
  if (typeof window !== 'undefined' && window.deferredInstallPrompt) {
    window.deferredInstallPrompt = undefined;
  }
}

/**
 * Track installation event
 */
export function trackInstallEvent(outcome: 'accepted' | 'dismissed'): void {
  // Send to analytics
  if (typeof window !== 'undefined' && (window as Window & { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag!('event', 'pwa_install', {
      event_category: 'PWA',
      event_label: outcome,
    });
  }

  // Store in localStorage for tracking
  try {
    localStorage.setItem('pwa_install_prompt_shown', 'true');
    localStorage.setItem('pwa_install_outcome', outcome);
    localStorage.setItem('pwa_install_date', new Date().toISOString());
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Get install statistics from localStorage
 */
export function getInstallStats(): {
  promptShown: boolean;
  outcome: string | null;
  date: string | null;
} {
  if (typeof window === 'undefined') {
    return { promptShown: false, outcome: null, date: null };
  }

  try {
    return {
      promptShown: localStorage.getItem('pwa_install_prompt_shown') === 'true',
      outcome: localStorage.getItem('pwa_install_outcome'),
      date: localStorage.getItem('pwa_install_date'),
    };
  } catch (e) {
    return { promptShown: false, outcome: null, date: null };
  }
}

/**
 * Get iOS installation instructions
 */
export function getIOSInstallInstructions(): string[] {
  return [
    'Tap the Share button in Safari',
    'Scroll down and tap "Add to Home Screen"',
    'Tap "Add" in the top right',
  ];
}

/**
 * Get Android installation instructions
 */
export function getAndroidInstallInstructions(): string[] {
  return [
    'Tap the menu (three dots) in Chrome',
    'Tap "Add to Home screen"',
    'Tap "Add" to confirm',
  ];
}
