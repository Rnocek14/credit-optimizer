import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Database } from 'lucide-react';

export function OptimizerDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      console.log('[OptimizerDataSeeder] Starting seed...');
      
      const { data, error } = await supabase.functions.invoke('seed-optimizer-data', {
        body: {}
      });

      if (error) {
        console.error('[OptimizerDataSeeder] Error:', error);
        toast.error('Failed to seed optimizer data');
        return;
      }

      console.log('[OptimizerDataSeeder] Result:', data);
      toast.success(
        `Optimizer data seeded successfully! ${data.counts.alt_credits} courses, ${data.counts.equivalencies} equivalencies, ${data.counts.degree_templates} template.`
      );
      
    } catch (error) {
      console.error('[OptimizerDataSeeder] Failed:', error);
      toast.error('Failed to seed optimizer data');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Optimizer Data Seeder</h3>
          <p className="text-sm text-muted-foreground">
            Populate all optimizer tables with TESU BSBA data
          </p>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>This will seed:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>50 alternative credit sources (CLEP, DSST, Sophia, Study.com)</li>
          <li>50 course equivalencies to TESU</li>
          <li>1 TESU BSBA cheapest degree template</li>
        </ul>
      </div>

      <Button 
        onClick={handleSeed} 
        disabled={isSeeding}
        className="w-full"
      >
        {isSeeding ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Seeding Data...
          </>
        ) : (
          'Seed Optimizer Data'
        )}
      </Button>
    </Card>
  );
}
