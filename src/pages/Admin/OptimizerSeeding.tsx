import { useState } from 'react';
import { useOptimizerSeeder, FunctionHealthStatus } from '@/hooks/useOptimizerSeeder';
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
  Info,
  Wifi,
  WifiOff,
  ArrowRightLeft,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TableStatus {
  name: string;
  exists: boolean;
  rowCount: number | null;
}

const EDGE_FUNCTIONS = [
  'optimizer-seed-tesu',
  'optimizer-seed-cosc',
  'optimizer-seed-excelsior',
  'optimizer-seed-wgu',
  'seed-v5-marketplace',
  'run-seeds',
];

export default function OptimizerSeeding() {
  const { runJob, getJobState, clearResults, checkFunctionHealth } = useOptimizerSeeder();
  const { toast } = useToast();
  const [tableStatus, setTableStatus] = useState<TableStatus[]>([]);
  const [isCheckingTables, setIsCheckingTables] = useState(false);
  const [healthStatus, setHealthStatus] = useState<FunctionHealthStatus[]>([]);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const tesuState = getJobState('seed-tesu');
  const coscState = getJobState('seed-cosc');
  const excelsiorState = getJobState('seed-excelsior');
  const wguState = getJobState('seed-wgu');
  
  // Transfer rules seeding state
  const [transferRulesState, setTransferRulesState] = useState<{
    isRunning: boolean;
    lastResult: any;
    error: string | null;
  }>({ isRunning: false, lastResult: null, error: null });

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

  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const results = await checkFunctionHealth(EDGE_FUNCTIONS);
      setHealthStatus(results);
      
      const reachableCount = results.filter(r => r.reachable).length;
      if (reachableCount === results.length) {
        toast({
          title: "All functions reachable ✓",
          description: `${reachableCount}/${results.length} edge functions responding.`,
        });
      } else {
        toast({
          title: "Some functions unreachable",
          description: `${reachableCount}/${results.length} edge functions responding. Check deployment status.`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Health check failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCheckingHealth(false);
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
  const hasSeededData = tesuState.lastResult?.success || coscState.lastResult?.success || excelsiorState.lastResult?.success || wguState.lastResult?.success;

  const handleRunWguSeed = async () => {
    try {
      const result = await runJob('seed-wgu');
      if (result.success) {
        toast({
          title: 'WGU data seeded ✓',
          description: `Seeded ${Object.values(result.tables).reduce((sum, t) => sum + t.inserted, 0)} rows across ${Object.keys(result.tables).length} tables.`,
        });
      } else {
        toast({
          title: 'Seeding failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Seeding error',
        description: err.message || 'Failed to run seeding job',
        variant: 'destructive',
      });
    }
  };

  const handleRunExcelsiorSeed = async () => {
    try {
      const result = await runJob('seed-excelsior');
      if (result.success) {
        toast({
          title: "Excelsior data seeded ✓",
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

  // Handler for Transfer Rules seeding
  const handleRunTransferRulesSeed = async () => {
    setTransferRulesState(prev => ({ ...prev, isRunning: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('run-seeds', {
        body: {}
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to invoke run-seeds');
      }
      
      if (data?.success) {
        setTransferRulesState({
          isRunning: false,
          lastResult: data,
          error: null
        });
        
        toast({
          title: "Transfer rules seeded ✓",
          description: `${data.stats?.total || 0} rules processed: ${data.stats?.inserted || 0} inserted, ${data.stats?.updated || 0} updated`,
        });
      } else {
        throw new Error(data?.error || 'Seeding returned success=false');
      }
    } catch (err: any) {
      setTransferRulesState(prev => ({
        ...prev,
        isRunning: false,
        error: err.message || 'Unknown error'
      }));
      
      toast({
        title: "Transfer rules seeding failed",
        description: err.message || "Failed to run seeding job",
        variant: "destructive",
      });
    }
  };

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
            <li><strong>Check Functions</strong> — Verify edge functions are deployed and reachable</li>
            <li><strong>Check Tables</strong> — Verify optimizer tables exist (created via migrations)</li>
            <li><strong>Run Seeders</strong> — Click "Run Job" to populate institution data</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Edge Function Health Check */}
      <div className="mb-8 p-6 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Edge Function Health
            </h2>
            <p className="text-sm text-muted-foreground">
              Check if edge functions are deployed and responding
            </p>
          </div>
          <Button onClick={runHealthCheck} disabled={isCheckingHealth} variant="outline">
            {isCheckingHealth ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test Functions
              </>
            )}
          </Button>
        </div>

        {healthStatus.length > 0 && (
          <div className="space-y-2">
            {healthStatus.map((fn) => (
              <div 
                key={fn.name}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  fn.reachable 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {fn.reachable ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-mono">{fn.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {fn.responseTime && (
                    <Badge variant="outline" className="text-xs">
                      {fn.responseTime}ms
                    </Badge>
                  )}
                  {fn.reachable ? (
                    <Badge className="bg-green-600 text-xs">Reachable</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      {fn.error?.slice(0, 40) || 'Unreachable'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {healthStatus.length > 0 && healthStatus.some(fn => !fn.reachable) && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Functions Not Deployed</AlertTitle>
            <AlertDescription className="text-sm">
              Some edge functions are not reachable. This usually means they haven't been deployed yet.
              <br />
              <strong>Fix:</strong> Wait for the Lovable build to complete, or check Supabase Dashboard → Edge Functions.
            </AlertDescription>
          </Alert>
        )}
      </div>

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

          <SeedingJobCard
            jobName="seed-excelsior"
            title="Seed Excelsior Core Data"
            description="Seeds Excelsior University institution, 5 credit limits, 5 gen-ed categories, and BS Liberal Studies template."
            state={excelsiorState}
            onRun={handleRunExcelsiorSeed}
            icon={<GraduationCap className="h-5 w-5 text-purple-600" />}
          />

          <SeedingJobCard
            jobName="seed-wgu"
            title="Seed WGU Core Data"
            description="Seeds Western Governors University institution, 5 credit limits, 5 gen-ed categories, and BS IT template."
            state={wguState}
            onRun={handleRunWguSeed}
            icon={<GraduationCap className="h-5 w-5 text-indigo-600" />}
          />
        </div>
        
        {/* Transfer Rules Section */}
        <div className="mt-8">
          <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Rules (Decentralized Degrees)
          </h3>
          
          <div className="p-6 border rounded-lg bg-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold">Seed Credit Transfer Rules</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Seeds 70+ verified transfer rules for Sophia, Study.com, CLEP → TESU. 
                  Critical for decentralized degrees - ensures all template courses have verified transfer paths.
                </p>
                
                {transferRulesState.lastResult && (
                  <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Last Run: {new Date(transferRulesState.lastResult.runAt || Date.now()).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Total:</span>{' '}
                        <span className="font-mono">{transferRulesState.lastResult.stats?.total || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Inserted:</span>{' '}
                        <span className="font-mono text-green-600">{transferRulesState.lastResult.stats?.inserted || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Skipped:</span>{' '}
                        <span className="font-mono text-muted-foreground">{transferRulesState.lastResult.stats?.skipped || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">After:</span>{' '}
                        <span className="font-mono">{transferRulesState.lastResult.stats?.afterCount || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {transferRulesState.error && (
                  <Alert variant="destructive" className="mb-4">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Seeding Failed</AlertTitle>
                    <AlertDescription className="text-sm">
                      <p className="mb-2">{transferRulesState.error}</p>
                      {transferRulesState.error.includes('row-level security') && (
                        <div className="mt-3 p-3 bg-background rounded border text-xs">
                          <p className="font-medium mb-2">RLS Policy Required:</p>
                          <p className="mb-2">Run this SQL in Supabase Dashboard → SQL Editor:</p>
                          <pre className="p-2 bg-muted rounded overflow-x-auto text-[10px]">
{`CREATE POLICY "Allow public insert for seeding"
  ON credit_transfer_rules FOR INSERT TO public
  WITH CHECK (true);`}
                          </pre>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2"
                            onClick={() => {
                              navigator.clipboard.writeText(`CREATE POLICY "Allow public insert for seeding" ON credit_transfer_rules FOR INSERT TO public WITH CHECK (true);`);
                              toast({ title: "SQL copied to clipboard" });
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy SQL
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div className="flex flex-col gap-2 ml-4">
                <Button 
                  onClick={handleRunTransferRulesSeed}
                  disabled={transferRulesState.isRunning}
                >
                  {transferRulesState.isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Run Seed
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://supabase.com/dashboard/project/vzpissitddpunkpythsb/sql/new', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" /> SQL Editor
                </Button>
              </div>
            </div>
          </div>
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
          <AlertTitle className="text-green-700 dark:text-green-400">Data Ready</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-300">
            Optimizer data has been seeded. You can now test the Credit Optimizer at{' '}
            <Link to="/edu-tree-v5" className="underline font-medium">
              /edu-tree-v5
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Info */}
      <div className="mt-8 pt-6 border-t">
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">Debug Info</summary>
          <div className="mt-2 p-3 bg-muted rounded font-mono space-y-1">
            <p>Supabase URL: https://vzpissitddpunkpythsb.supabase.co</p>
            <p>Project ID: vzpissitddpunkpythsb</p>
            <p>Functions:</p>
            <ul className="ml-4 list-disc">
              {EDGE_FUNCTIONS.map(fn => (
                <li key={fn}>{fn}</li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}
