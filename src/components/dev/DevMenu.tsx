import { useState, useEffect } from 'react';
import { usePathStore } from '@/stores/usePathStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, Zap, CheckSquare, RotateCcw, Loader2, Bug } from 'lucide-react';

export function DevMenu() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(() => 
    (window as any).__LP_DEMO_MODE__ || false
  );

  // Expose debug utilities on window in dev mode
  useEffect(() => {
    if (import.meta.env.MODE !== 'production') {
      (window as any).lpDebug = {
        prereq: (title: string) => usePathStore.getState().debugPrereqStatus?.(title),
        revalidate: () => usePathStore.getState().revalidateAllStatuses(),
        store: () => usePathStore.getState()
      };
    }
  }, []);

  // Sync demo mode across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === '__LP_DEMO_MODE__') {
        (window as any).__LP_DEMO_MODE__ = e.newValue === 'true';
        setIsDemoMode(e.newValue === 'true');
        usePathStore.getState().revalidateAllStatuses();
        // Force a light layout settle for visible correctness
        usePathStore.getState().scheduleLayout('demo-mode-storage-sync');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleSeedBasics = async () => {
    setIsLoading('seed');
    try {
      const store = usePathStore.getState();
      await store.seedDemoReactBasics();
      store.revalidateAllStatuses();
      console.log('✅ Demo React basics seeded');
    } catch (error) {
      console.error('❌ Failed to seed basics:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleCompletePrereqs = async () => {
    setIsLoading('prereqs');
    try {
      const store = usePathStore.getState();
      await store.completeByTitles([
        'React Hooks & Advanced State',
        'Patterns & Composition in React',
        'React Performance & Optimization',
      ]);
      console.log('✅ Advanced React Prerequisites completed');
    } catch (error) {
      console.error('❌ Failed to complete prereqs:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleToggleDemoMode = () => {
    const current = (window as any).__LP_DEMO_MODE__ || false;
    const newMode = !current;
    
    // Update window and localStorage
    (window as any).__LP_DEMO_MODE__ = newMode;
    localStorage.setItem('__LP_DEMO_MODE__', String(newMode));
    
    setIsDemoMode(newMode);
    console.log(`🔄 Demo mode ${newMode ? 'enabled' : 'disabled'}`);
    
    // Show immediate visual feedback
    const store = usePathStore.getState();
    const changed = store.revalidateAllStatuses();
    if (changed) store.scheduleLayout('devmenu-toggle');
    
    window.location.reload();
  };

  const handleRevalidate = () => {
    setIsLoading('revalidate');
    try {
      const store = usePathStore.getState();
      const changed = store.revalidateAllStatuses();
      if (changed) store.scheduleLayout('devmenu-revalidate');
      console.log('🔄 All statuses revalidated');
    } finally {
      setIsLoading(null);
    }
  };

  const handleDebugPrereq = () => {
    const title = prompt('Enter skill/course title to debug:');
    if (title) {
      const result = usePathStore.getState().debugPrereqStatus(title);
      console.log('🐛 Prerequisite Debug:', result);
      alert(`Debug result logged to console. Status: ${result.decision || result.error}`);
    }
  };

  const handleToggleGrowthLayer = () => {
    const currentParams = new URLSearchParams(window.location.search);
    const isEnabled = currentParams.get('growth_layer') === 'true';
    
    if (isEnabled) {
      currentParams.delete('growth_layer');
    } else {
      currentParams.set('growth_layer', 'true');
    }
    
    const newUrl = `${window.location.pathname}${currentParams.toString() ? '?' + currentParams.toString() : ''}`;
    window.location.href = newUrl;
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 z-[9999] h-10 w-10 p-0 shadow-lg bg-background border-muted-foreground/20"
      >
        <Settings className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-[9999] p-4 shadow-xl bg-background border-muted-foreground/20 min-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Dev Menu</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          ✕
        </Button>
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedBasics}
          disabled={isLoading === 'seed'}
          className="w-full justify-start text-xs h-8"
        >
          {isLoading === 'seed' ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Zap className="mr-2 h-3 w-3" />
          )}
          Seed React Basics
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCompletePrereqs}
          disabled={isLoading === 'prereqs'}
          className="w-full justify-start text-xs h-8"
        >
          {isLoading === 'prereqs' ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <CheckSquare className="mr-2 h-3 w-3" />
          )}
          Complete ARP Prereqs
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleDemoMode}
          className="w-full justify-start text-xs h-8"
        >
          <RotateCcw className="mr-2 h-3 w-3" />
          Toggle Demo Mode
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRevalidate}
          disabled={isLoading === 'revalidate'}
          className="w-full justify-start text-xs h-8"
        >
          {isLoading === 'revalidate' ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-3 w-3" />
          )}
          Revalidate Statuses
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDebugPrereq}
          className="w-full justify-start text-xs h-8"
        >
          <Bug className="mr-2 h-3 w-3" />
          Debug Prerequisites
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleGrowthLayer}
          className="w-full justify-start text-xs h-8"
        >
          <Zap className="mr-2 h-3 w-3" />
          Toggle Growth Layer
        </Button>
      </div>

      <div className="mt-3 pt-3 border-t border-muted-foreground/10">
        <p className="text-xs text-muted-foreground">
          Demo Mode: {isDemoMode ? '🟢 ON' : '🔴 OFF'}
        </p>
        <p className="text-xs text-muted-foreground">
          Growth Layer: {new URLSearchParams(window.location.search).get('growth_layer') === 'true' ? '🟢 ON' : '🔴 OFF'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <a href="/quick-start" className="text-primary hover:underline">→ Quick Start</a>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Console: <code className="text-xs">lpDebug.prereq('course title')</code>
        </p>
      </div>
    </Card>
  );
}