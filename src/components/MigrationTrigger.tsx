import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function MigrationTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const handleMigration = async () => {
    setIsRunning(true);
    try {
      console.log('🚀 Applying database migrations...');
      
      const { data, error } = await supabase.functions.invoke('run-migrations', {
        body: { confirm: true }
      });

      if (error) {
        console.error('Migration error:', error);
        toast.error('Migration failed. Check console for details.');
        return;
      }

      if (data?.alreadyApplied) {
        toast.info('Migrations already applied');
        setHasRun(true);
        return;
      }

      console.log('✅ Migrations applied:', data);
      toast.success(data.message || 'Database migrations applied successfully!');
      setHasRun(true);
      
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Failed to apply migrations. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button
      onClick={handleMigration}
      disabled={isRunning || hasRun}
      variant={hasRun ? "outline" : "default"}
      size="sm"
      className="flex items-center gap-2"
    >
      {isRunning ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : hasRun ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <Database className="w-4 h-4" />
      )}
      {isRunning ? 'Applying...' : hasRun ? 'Migrations Applied' : 'Apply Database Migrations'}
    </Button>
  );
}
