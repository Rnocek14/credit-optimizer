import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sprout, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SeedTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showSchemaHelp, setShowSchemaHelp] = useState(false);

  const handleSeed = async () => {
    setIsRunning(true);
    try {
      console.log('🌱 Running database seeds...');
      
      const { data, error } = await supabase.functions.invoke('run-seeds', {
        body: { confirm: true }
      });

      if (error) {
        console.error('Seed error:', error);
        
        // Check if it's a schema error
        if (data?.error === 'Table schema mismatch') {
          setShowSchemaHelp(true);
          toast.error('Schema needs to be fixed first', {
            description: 'Click the help button below for instructions',
            duration: 8000
          });
        } else {
          toast.error('Seed failed. Check console for details.');
        }
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
    <>
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
      
      {showSchemaHelp && (
        <div className="mt-2 p-3 border border-amber-500/30 bg-amber-500/10 rounded-md text-xs space-y-2">
          <p className="font-medium text-amber-700 dark:text-amber-300">
            Schema Fix Required
          </p>
          <p className="text-muted-foreground">
            The credit_transfer_rules table needs to be recreated with the correct schema.
          </p>
          <details className="text-muted-foreground">
            <summary className="cursor-pointer font-medium mb-1">Click to see SQL</summary>
            <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
{`DROP TABLE IF EXISTS credit_transfer_rules CASCADE;

CREATE TABLE credit_transfer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_institution TEXT NOT NULL,
  source_course_code TEXT NOT NULL,
  target_institution TEXT NOT NULL,
  target_course_code TEXT,
  acceptance_status TEXT DEFAULT 'accepted',
  rule_source TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE credit_transfer_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON credit_transfer_rules FOR SELECT USING (true);`}
            </pre>
          </details>
          <p className="text-xs italic">
            Run this in: Cloud → Database → Insert Data
          </p>
        </div>
      )}
    </>
  );
}
