import { useState } from 'react';
import { useOptimizerSeeder } from '@/hooks/useOptimizerSeeder';
import { SeedingJobCard } from '@/components/admin/SeedingJobCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  GraduationCap, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ArrowLeft,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TableStatus {
  name: string;
  exists: boolean;
  rowCount: number | null;
}

export default function OptimizerSeeding() {
  const { runJob, getJobState, clearResults } = useOptimizerSeeder();
  const { toast } = useToast();
  const [tableStatus, setTableStatus] = useState<TableStatus[]>([]);
  const [isCheckingTables, setIsCheckingTables] = useState(false);

  const tesuState = getJobState('seed-tesu');
  const coscState = getJobState('seed-cosc');

  const checkTables = async () => {
    setIsCheckingTables(true);
    const tables = [
      'institution_credit_limits',
      'alt_credits', 
      'cross_institution_equivalencies',
      'gened_frameworks',
      'gened_categories',
      'degree_templates'
    ];

    const results: TableStatus[] = [];

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table as any)
          .select('*', { count: 'exact', head: true });
        
        results.push({
          name: table,
          exists: !error,
          rowCount: error ? null : (count ?? 0)
        });
      } catch {
        results.push({ name: table, exists: false, rowCount: null });
      }
    }

    setTableStatus(results);
    setIsCheckingTables(false);

    const allExist = results.every(r => r.exists);
    if (allExist) {
      toast({
        title: "All tables exist ✓",
        description: "Ready to seed data.",
      });
    } else {
      toast({
        title: "Missing tables",
        description: "Run the migration first to create tables.",
        variant: "destructive",
      });
    }
  };

  const handleRunTesuSeed = async () => {
    try {
      const result = await runJob('seed-tesu');
      if (result.success) {
        toast({
          title: "TESU data seeded ✓",
          description: `Seeded ${Object.values(result.tables).reduce((sum, t) => sum + t.inserted, 0)} rows across ${Object.keys(result.tables).length} tables.`,
        });
      } else {
        toast({
          title: "Seeding failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Seeding error",
        description: err.message || "Failed to run seeding job",
        variant: "destructive",
      });
    }
  };

  const handleRunCoscSeed = async () => {
    try {
      const result = await runJob('seed-cosc');
      if (result.success) {
        toast({
          title: "COSC data seeded ✓",
          description: `Seeded ${Object.values(result.tables).reduce((sum, t) => sum + t.inserted, 0)} rows across ${Object.keys(result.tables).length} tables.`,
        });
      } else {
        toast({
          title: "Seeding failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Seeding error",
        description: err.message || "Failed to run seeding job",
        variant: "destructive",
      });
    }
  };

  const allTablesExist = tableStatus.length > 0 && tableStatus.every(t => t.exists);
  const hasSeededData = tesuState.lastResult?.success || coscState.lastResult?.success;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Link to="/optimizer-setup" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Optimizer Setup
        </Link>
        <h1 className="text-3xl font-bold">Optimizer Seeding Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Run seeding jobs without touching the SQL editor. All operations are idempotent (safe to re-run).
        </p>
      </div>

      {/* Status Overview */}
      <Alert className="mb-8">
        <Info className="h-4 w-4" />
        <AlertTitle>How This Works</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
            <li><strong>Check Tables</strong> — Verify optimizer tables exist (created via migrations)</li>
            <li><strong>Seed TESU Data</strong> — Click "Run Job" to populate TESU policies, alt credits, equivalencies, and templates</li>
            <li><strong>Verify</strong> — Check the results show expected row counts</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Table Status Check */}
      <div className="mb-8 p-6 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Table Status
            </h2>
            <p className="text-sm text-muted-foreground">
              Check if optimizer tables exist before seeding
            </p>
          </div>
          <Button onClick={checkTables} disabled={isCheckingTables} variant="outline">
            {isCheckingTables ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Tables
              </>
            )}
          </Button>
        </div>

        {tableStatus.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {tableStatus.map((table) => (
              <div 
                key={table.name}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  table.exists 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {table.exists ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-xs font-mono truncate">{table.name}</span>
                </div>
                {table.rowCount !== null && (
                  <Badge variant="secondary" className="text-xs">
                    {table.rowCount}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {!allTablesExist && tableStatus.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Missing Tables</AlertTitle>
            <AlertDescription>
              Some optimizer tables don't exist. Run the migration in Supabase or check the setup guide.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Seeding Jobs */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Seeding Jobs</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <SeedingJobCard
            jobName="seed-tesu"
            title="Seed TESU Core Data"
            description="Seeds TESU institution, credit limits, gen-ed categories, 50 alt credits, 50 equivalencies, and BSBA degree template."
            state={tesuState}
            onRun={handleRunTesuSeed}
            icon={<GraduationCap className="h-5 w-5 text-blue-600" />}
          />

          <SeedingJobCard
            jobName="seed-cosc"
            title="Seed COSC Core Data"
            description="Seeds Charter Oak State College institution, 6 credit limits, 11 gen-ed categories, and BA General Studies template."
            state={coscState}
            onRun={handleRunCoscSeed}
            icon={<GraduationCap className="h-5 w-5 text-emerald-600" />}
          />
        </div>
      </div>

      {/* Clear Results */}
      <div className="mt-8 pt-6 border-t">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Clear Local Results</p>
            <p className="text-xs text-muted-foreground">
              Clears cached seeding results from localStorage
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            clearResults();
            toast({ title: "Results cleared" });
          }}>
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Success State */}
      {hasSeededData && (
        <Alert className="mt-8 border-green-500/30 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700 dark:text-green-400">TESU Data Ready</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-300">
            TESU optimizer data has been seeded. You can now test the Credit Optimizer at{' '}
            <Link to="/edu-tree-v5" className="underline font-medium">
              /edu-tree-v5
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
