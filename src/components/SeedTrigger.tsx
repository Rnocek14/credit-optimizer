import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sprout, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SeedTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const handleSeed = async () => {
    setIsRunning(true);
    try {
      console.log('🌱 Running database seeds...');
      
      const { data, error } = await supabase.functions.invoke('run-seeds', {
        body: { confirm: true }
      });

      if (error) {
        console.error('Seed error:', error);
        toast.error('Seed failed. Check console for details.');
        return;
      }

      if (data?.alreadySeeded) {
        toast.info('Seeds already applied');
        setHasRun(true);
        return;
      }

      console.log('✅ Seeds applied:', data);
      toast.success(data.message || 'Database seeds applied successfully!');
      setHasRun(true);
      
    } catch (error) {
      console.error('Seed failed:', error);
      toast.error('Failed to apply seeds. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button
      onClick={handleSeed}
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
        <Sprout className="w-4 h-4" />
      )}
      {isRunning ? 'Seeding...' : hasRun ? 'Seeds Applied' : 'Apply Database Seeds'}
    </Button>
  );
}
