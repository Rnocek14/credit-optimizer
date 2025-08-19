import { useState } from 'react';
import { usePathStore } from '@/stores/usePathStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, Zap, CheckSquare, RotateCcw, Loader2 } from 'lucide-react';

export function DevMenu() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

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
    (window as any).__LP_DEMO_MODE__ = !current;
    console.log(`🔄 Demo mode ${!current ? 'enabled' : 'disabled'}`);
    window.location.reload();
  };

  const handleRevalidate = () => {
    setIsLoading('revalidate');
    try {
      const store = usePathStore.getState();
      store.revalidateAllStatuses();
      console.log('🔄 All statuses revalidated');
    } finally {
      setIsLoading(null);
    }
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
      </div>

      <div className="mt-3 pt-3 border-t border-muted-foreground/10">
        <p className="text-xs text-muted-foreground">
          Demo Mode: {(window as any).__LP_DEMO_MODE__ ? '🟢 ON' : '🔴 OFF'}
        </p>
      </div>
    </Card>
  );
}