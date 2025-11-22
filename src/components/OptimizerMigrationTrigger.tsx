import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function OptimizerMigrationTrigger() {
  const [showSQL, setShowSQL] = useState(false);

  const handleCopySQL = () => {
    const sqlPath = '/scripts/optimizer-tables-setup.sql';
    window.open(sqlPath, '_blank');
    toast.success('Opening SQL file - copy and paste into Supabase SQL Editor');
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertTitle>Week 1: Optimizer Database Setup</AlertTitle>
        <AlertDescription>
          <p className="mb-2">Creates 5 core tables for the degree optimizer:</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li><strong>institution_credit_limits</strong> - Policy caps & minimums</li>
            <li><strong>alt_credits</strong> - CLEP, DSST, Sophia, Study.com catalog</li>
            <li><strong>cross_institution_equivalencies</strong> - Transfer mappings</li>
            <li><strong>gened_categories</strong> - Gen-ed requirements</li>
            <li><strong>degree_templates</strong> - Complete degree plans</li>
          </ul>
          <p className="mt-3 text-sm font-semibold">+ Seeds TESU BSBA policy data (11 limits, 7 gen-ed categories)</p>
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button
          onClick={handleCopySQL}
          size="lg"
          className="flex-1"
        >
          <Database className="w-5 h-5 mr-2" />
          Open SQL File
        </Button>
        <Button
          onClick={() => setShowSQL(!showSQL)}
          variant="outline"
          size="lg"
        >
          {showSQL ? 'Hide' : 'Show'} Instructions
        </Button>
      </div>

      {showSQL && (
        <Alert>
          <AlertTitle>Setup Instructions</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "Open SQL File" above to view the SQL script</li>
              <li>Copy the entire SQL content</li>
              <li>Open your <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></li>
              <li>Paste and run the SQL</li>
              <li>Verify with the verification queries at the bottom</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              See <code>docs/optimizer-setup-guide.md</code> for detailed documentation
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
