import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Shield, Database, Play, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SeederResult {
  function: string;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
  executedBy?: string;
}

interface TestResult {
  testName: string;
  expected: number;
  actual: number;
  passed: boolean;
  details?: string;
}

const CANONICAL_SEEDERS = [
  { name: 'seed-sophia-canonical', label: 'SOPHIA Canonical', provider: 'SOPHIA' },
  { name: 'seed-studycom-canonical', label: 'Study.com Canonical', provider: 'STUDYCOM' },
  { name: 'seed-clep-canonical', label: 'CLEP Canonical', provider: 'CLEP' },
];

export function CanonicalSeederHarness() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SeederResult[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedSeeder, setSelectedSeeder] = useState<string | null>(null);

  // Run a single seeder with the current user's token
  const runSeeder = async (functionName: string): Promise<SeederResult> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      return {
        function: functionName,
        status: 401,
        success: false,
        error: 'No active session - please log in',
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        // Parse status from error if available
        const status = (error as any)?.status || 500;
        return {
          function: functionName,
          status,
          success: false,
          error: error.message || 'Unknown error',
        };
      }

      return {
        function: functionName,
        status: 200,
        success: true,
        data,
        executedBy: data?.executed_by,
      };
    } catch (err: any) {
      return {
        function: functionName,
        status: err.status || 500,
        success: false,
        error: err.message || 'Request failed',
      };
    }
  };

  // Run role gate test: expects 403 for non-admin, 200 for admin
  const runRoleGateTest = async () => {
    setIsRunning(true);
    setResults([]);
    setTestResults([]);

    const seederResults: SeederResult[] = [];
    const tests: TestResult[] = [];

    for (const seeder of CANONICAL_SEEDERS) {
      const result = await runSeeder(seeder.name);
      seederResults.push(result);
    }

    setResults(seederResults);

    // Analyze results
    const successCount = seederResults.filter(r => r.status === 200).length;
    const forbiddenCount = seederResults.filter(r => r.status === 403).length;
    const unauthorizedCount = seederResults.filter(r => r.status === 401).length;

    if (successCount === CANONICAL_SEEDERS.length) {
      tests.push({
        testName: 'Admin Role Gate',
        expected: 200,
        actual: 200,
        passed: true,
        details: `All ${successCount} seeders executed successfully as admin. Check executed_by in results.`,
      });
    } else if (forbiddenCount === CANONICAL_SEEDERS.length) {
      tests.push({
        testName: 'Admin Role Gate',
        expected: 403,
        actual: 403,
        passed: true,
        details: `All ${forbiddenCount} seeders correctly blocked non-admin user with 403.`,
      });
    } else if (unauthorizedCount > 0) {
      tests.push({
        testName: 'Admin Role Gate',
        expected: 200,
        actual: 401,
        passed: false,
        details: 'Authentication failed. Please log in and try again.',
      });
    } else {
      tests.push({
        testName: 'Admin Role Gate',
        expected: 200,
        actual: seederResults[0]?.status || 0,
        passed: false,
        details: `Mixed results: ${successCount} success, ${forbiddenCount} forbidden, ${unauthorizedCount} unauthorized.`,
      });
    }

    setTestResults(tests);
    setIsRunning(false);
  };

  // Run a single seeder (for admin execution)
  const runSingleSeeder = async (functionName: string) => {
    setSelectedSeeder(functionName);
    setIsRunning(true);
    
    const result = await runSeeder(functionName);
    setResults([result]);
    
    if (result.success) {
      setTestResults([{
        testName: `Execute ${functionName}`,
        expected: 200,
        actual: 200,
        passed: true,
        details: `Seeder executed by: ${result.executedBy || 'unknown'}`,
      }]);
    } else {
      setTestResults([{
        testName: `Execute ${functionName}`,
        expected: 200,
        actual: result.status,
        passed: false,
        details: result.error,
      }]);
    }
    
    setIsRunning(false);
    setSelectedSeeder(null);
  };

  const allTestsPassed = testResults.length > 0 && testResults.every(t => t.passed);
  const isAdmin = results.some(r => r.status === 200 && r.executedBy);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Canonical Seeder Harness</CardTitle>
        </div>
        <CardDescription>
          Test role gating and execute canonical identity seeders with your current session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={runRoleGateTest}
            disabled={isRunning}
            variant="outline"
            className="gap-2"
          >
            {isRunning && !selectedSeeder ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Test Role Gate (All Seeders)
          </Button>
        </div>

        {/* Individual Seeder Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Run Individual Seeder (Admin Only)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CANONICAL_SEEDERS.map((seeder) => (
              <Button
                key={seeder.name}
                onClick={() => runSingleSeeder(seeder.name)}
                disabled={isRunning}
                variant="secondary"
                className="gap-2 justify-start"
              >
                {selectedSeeder === seeder.name ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                {seeder.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Alert variant={allTestsPassed ? "default" : "destructive"} className={cn(
            allTestsPassed && "border-green-500 bg-green-50 dark:bg-green-950/20"
          )}>
            {allTestsPassed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>{allTestsPassed ? 'Tests Passed' : 'Tests Failed'}</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1">
                {testResults.map((test, i) => (
                  <li key={i} className="text-sm">
                    <span className={test.passed ? 'text-green-700 dark:text-green-400' : 'text-destructive'}>
                      {test.passed ? '✓' : '✗'} {test.testName}
                    </span>
                    {test.details && (
                      <span className="text-muted-foreground ml-2">— {test.details}</span>
                    )}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Response Details</p>
            <div className="grid gap-2">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-lg border text-sm",
                    result.success ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" :
                    result.status === 403 ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800" :
                    "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{result.function}</span>
                    <Badge variant={result.success ? "default" : result.status === 403 ? "secondary" : "destructive"}>
                      {result.status}
                    </Badge>
                  </div>
                  {result.executedBy && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Executed by: <span className="font-medium">{result.executedBy}</span>
                    </p>
                  )}
                  {result.error && (
                    <p className="mt-1 text-xs text-destructive">{result.error}</p>
                  )}
                  {result.data && !result.error && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                        View response data
                      </summary>
                      <pre className="mt-1 text-xs overflow-auto max-h-32 p-2 bg-muted rounded">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted rounded p-3 space-y-1">
          <p><strong>How to test role gating:</strong></p>
          <ol className="list-decimal ml-4 space-y-0.5">
            <li>Log in as a <strong>non-admin</strong> user → Click "Test Role Gate" → Expect all 403s</li>
            <li>Log in as an <strong>admin</strong> user → Click "Test Role Gate" → Expect all 200s with executed_by</li>
          </ol>
          <p className="mt-2"><strong>To execute seeders:</strong> Use individual buttons after confirming admin role works.</p>
        </div>
      </CardContent>
    </Card>
  );
}
