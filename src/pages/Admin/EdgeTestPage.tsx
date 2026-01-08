import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUPABASE_URL = "https://vzpissitddpunkpythsb.supabase.co";

export default function EdgeTestPage() {
  const [results, setResults] = useState<Record<string, { status: string; data?: string; error?: string }>>({});
  const [testing, setTesting] = useState(false);

  const testFunction = async (name: string, body?: object) => {
    const url = `${SUPABASE_URL}/functions/v1/${name}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await response.text();
      return { status: `${response.status} ${response.statusText}`, data: text };
    } catch (err) {
      return { status: "FAILED", error: String(err) };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults({});

    const tests = [
      { name: "run-seeds", body: { action: "ping" } },
      { name: "run-migrations", body: { action: "ping" } },
    ];

    for (const test of tests) {
      const result = await testFunction(test.name, test.body);
      setResults(prev => ({ ...prev, [test.name]: result }));
    }

    setTesting(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edge Function Diagnostics</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Direct Fetch Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Testing direct fetch to Edge Functions (bypassing Supabase client)
          </p>
          <Button onClick={runAllTests} disabled={testing}>
            {testing ? "Testing..." : "Run All Tests"}
          </Button>
        </CardContent>
      </Card>

      {Object.entries(results).map(([name, result]) => (
        <Card key={name} className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className={result.error ? "text-destructive" : "text-green-600"}>
                {result.error ? "✗" : "✓"}
              </span>
              {name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Status:</strong> {result.status}</p>
            {result.data && (
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                {result.data}
              </pre>
            )}
            {result.error && (
              <p className="text-destructive mt-2">{result.error}</p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className="mt-6 bg-muted">
        <CardContent className="pt-6">
          <p className="text-sm">
            <strong>If all tests fail:</strong> Edge Functions may not be deployed. 
            Check the Supabase Dashboard → Edge Functions tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
