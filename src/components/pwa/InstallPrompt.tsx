'use client';

import { useState, useEffect } from 'react';
import { useInstallPrompt } from '@/hooks/pwa/useInstallPrompt';
import { Button } from '@/components/ui';
import { X, Download, Share, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt Component
 * Shows install prompt for Android/Desktop and instructions for iOS
 */
export function InstallPrompt() {
  const {
    canInstall,
    isInstalled,
    isIOS,
    instructions,
    showPrompt,
    dismissPrompt,
  } = useInstallPrompt();

  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user has previously dismissed
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      const dismissedAt = localStorage.getItem('pwa_install_dismissed_at');
      
      if (dismissed && dismissedAt) {
        const daysSinceDismissed = 
          (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        
        // Show again after 7 days
        if (daysSinceDismissed < 7) {
          setIsDismissed(true);
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Show prompt after a delay
  useEffect(() => {
    if ((canInstall || isIOS) && !isInstalled && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isIOS, isInstalled, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    dismissPrompt();
    
    try {
      localStorage.setItem('pwa_install_dismissed', 'true');
      localStorage.setItem('pwa_install_dismissed_at', Date.now().toString());
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  const handleInstall = async () => {
    if (canInstall) {
      await showPrompt();
    }
    setIsVisible(false);
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            {isIOS ? (
              <Share className="w-5 h-5 text-primary" />
            ) : (
              <Download className="w-5 h-5 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">
              {isIOS ? 'Add to Home Screen' : 'Install Pink Beam ARM'}
            </h3>
            
            <p className="text-xs text-muted-foreground mt-1">
              {isIOS 
                ? 'Install this app on your iPhone for quick access.'
                : 'Install this app on your device for the best experience.'
              }
            </p>

            {isIOS && instructions.length > 0 && (
              <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                {instructions.slice(0, 3).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}

            {!isIOS && canInstall && (
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={handleInstall}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Install App
              </Button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
