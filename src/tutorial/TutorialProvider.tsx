import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { trackTelemetryEvent } from '@/utils/telemetry';

type TutorialContextValue = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
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

  const handleSetEnabled = (v: boolean) => {
    setEnabled(v);
    localStorage.setItem('lp:tutorial:enabled', String(v));
    trackTelemetryEvent({ 
      task: 'tutorial_toggle', 
      complexity: { enabled: v } 
    });
  };

  const value = useMemo(() => ({ enabled, setEnabled: handleSetEnabled }), [enabled]);
  
  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}