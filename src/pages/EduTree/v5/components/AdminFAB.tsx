import { useState } from 'react';
import { Settings, Database, Sprout, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MigrationTrigger } from '@/components/MigrationTrigger';
import { SeedTrigger } from '@/components/SeedTrigger';
import { cn } from '@/lib/utils';

interface AdminFABProps {
  useDatabase: boolean;
  onToggleDatabase: () => void;
  onResetPlan: () => void;
}

export function AdminFAB({ useDatabase, onToggleDatabase, onResetPlan }: AdminFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[140] flex flex-col-reverse items-end gap-3">
      {/* Expanded Controls */}
      <div
        className={cn(
          "flex flex-col gap-2 transition-all duration-300 origin-bottom-right",
          isOpen 
            ? "opacity-100 scale-100 pointer-events-auto" 
            : "opacity-0 scale-75 pointer-events-none"
        )}
      >
        {/* Database Mode Toggle */}
        <Button
          onClick={onToggleDatabase}
          variant="secondary"
          size="sm"
          className="shadow-lg hover:shadow-xl transition-all gap-2 min-w-[160px] justify-start"
          title="Toggle between database and fixture data"
        >
          <Database className="w-4 h-4" />
          <span className="text-xs font-medium">
            {useDatabase ? '🗄️ Database' : '🧪 Fixtures'}
          </span>
        </Button>

        {/* Database Controls - only show when in database mode */}
        {useDatabase && (
          <div className="flex flex-col gap-2 p-3 bg-background border rounded-lg shadow-lg">
            <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Database className="w-3 h-3" />
              Database Controls
            </div>
            <MigrationTrigger />
            <SeedTrigger />
          </div>
        )}

        {/* Reset Plan */}
        <Button
          onClick={onResetPlan}
          variant="destructive"
          size="sm"
          className="shadow-lg hover:shadow-xl transition-all gap-2 min-w-[160px] justify-start"
          title="Clear all course selections"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-xs font-medium">Reset Plan</span>
        </Button>
      </div>

      {/* Main FAB Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl hover:shadow-3xl transition-all",
          "bg-primary hover:bg-primary/90",
          isOpen && "rotate-90"
        )}
        title={isOpen ? "Close admin menu" : "Open admin menu"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Settings className="w-6 h-6" />
        )}
      </Button>

      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
