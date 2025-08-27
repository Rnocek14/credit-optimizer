import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { trackTelemetryEvent } from '@/utils/telemetry';

type TutorialContextValue = {
  enabled: boolean;
  setEnabled: (v: boolean, source?: { source: string }) => void;
  openTipById: (tipId: string) => boolean;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export const useTutorial = () => {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
};

export default function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('lp:tutorial:enabled');
    if (stored) setEnabled(stored === 'true');
  }, []);

  const handleSetEnabled = (v: boolean, source?: { source: string }) => {
    setEnabled(v);
    localStorage.setItem('lp:tutorial:enabled', String(v));
    trackTelemetryEvent({ 
      task: 'tutorial_toggle', 
      complexity: { enabled: v, source: source?.source || 'header' }
    });
  };

  const openTipById = (tipId: string): boolean => {
    const tipElement = document.querySelector(`[data-tutorial-tip="${tipId}"]`);
    if (tipElement) {
      (tipElement as HTMLElement).focus();
      const event = new MouseEvent('mouseenter', { bubbles: true });
      tipElement.dispatchEvent(event);
      return true;
    }
    return false;
  };

  const value = useMemo(() => ({ 
    enabled, 
    setEnabled: handleSetEnabled, 
    openTipById 
  }), [enabled]);
  
  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}