import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCcw, Database, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getEdgeFunctionUrl } from '@/lib/admin/supabaseExternalConfig';

/**
 * Admin coverage dashboard for the California ASSIST ingestion pipeline.
 * - Heatmap: agreement counts per (from CC -> to CSU/UC)
 * - Recent ingestion runs + errors
 * - Source-type breakdown of credit_transfer_rules
 * - Manual triggers for discover / fetch-parse workers
 */
export default function ArticulationCoverage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [triggering, setTriggering] = useState<string | null>(null);

  const heatmap = useQuery({
    queryKey: ['assist', 'heatmap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articulation_agreements')
        .select('from_institution_code, to_institution_code, status')
        .eq('source_system', 'ASSIST')
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const runs = useQuery({
    queryKey: ['assist', 'runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assist_ingestion_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const sourceBreakdown = useQuery({
    queryKey: ['assist', 'source-breakdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transfer_rules')
        .select('source_type, verification_status, provenance_system')
        .limit(10000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const key = `${row.source_type ?? 'unknown'} / ${row.verification_status ?? 'unknown'}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ key, count }));
    },
    enabled: isAdmin,
  });

  const trigger = async (fn: 'assist-discover' | 'assist-fetch-parse', body: Record<string, unknown>) => {
    setTriggering(fn);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(getEdgeFunctionUrl(fn), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token ?? ''}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      toast({ title: `${fn} complete`, description: JSON.stringify(json).slice(0, 200) });
      heatmap.refetch();
      runs.refetch();
      sourceBreakdown.refetch();
    } catch (err) {
      toast({
        title: `${fn} failed`,
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setTriggering(null);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6 flex gap-3 items-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span>Admin access required.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build a (from -> to) -> count map for the heatmap table
  const pairCounts = new Map<string, { from: string; to: string; total: number; parsed: number; pending: number; error: number }>();
  for (const row of heatmap.data ?? []) {
    const key = `${row.from_institution_code}::${row.to_institution_code}`;
    const cell = pairCounts.get(key) ?? {
      from: row.from_institution_code,
      to: row.to_institution_code,
      total: 0,
      parsed: 0,
      pending: 0,
      error: 0,
    };
    cell.total += 1;
    if (row.status === 'parsed') cell.parsed += 1;
    else if (row.status === 'error') cell.error += 1;
    else cell.pending += 1;
    pairCounts.set(key, cell);
  }
  const pairs = Array.from(pairCounts.values()).sort((a, b) => b.total - a.total);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">California ASSIST Coverage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provenance-first transfer graph. Source: assist.org articulation agreements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => trigger('assist-discover', { maxPairs: 10 })}
            disabled={triggering !== null}
          >
            {triggering === 'assist-discover' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Run discover (10)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => trigger('assist-fetch-parse', { batchSize: 5 })}
            disabled={triggering !== null}
          >
            {triggering === 'assist-fetch-parse' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2" />
            )}
            Run fetch+parse (5)
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agreements discovered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {heatmap.isLoading ? '…' : heatmap.data?.length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique (CC → target) pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{pairs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingestion runs (recent)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {runs.isLoading ? '…' : runs.data?.length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coverage heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {pairs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No agreements discovered yet. Click "Run discover" to seed the queue.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From (CC)</TableHead>
                    <TableHead>To (CSU/UC)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Parsed</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairs.slice(0, 200).map((p) => (
                    <TableRow key={`${p.from}-${p.to}`}>
                      <TableCell className="font-mono text-xs">{p.from}</TableCell>
                      <TableCell className="font-mono text-xs">{p.to}</TableCell>
                      <TableCell className="text-right">{p.total}</TableCell>
                      <TableCell className="text-right">
                        {p.parsed > 0 ? <Badge variant="default">{p.parsed}</Badge> : 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.pending > 0 ? <Badge variant="secondary">{p.pending}</Badge> : 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.error > 0 ? <Badge variant="destructive">{p.error}</Badge> : 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent ingestion runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.data && runs.data.length > 0 ? (
              <div className="max-h-[360px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Discovered</TableHead>
                      <TableHead className="text-right">Parsed</TableHead>
                      <TableHead className="text-right">Rules</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.data.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          {r.started_at ? new Date(r.started_at).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === 'completed'
                                ? 'default'
                                : r.status === 'error'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {r.status ?? 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{r.agreements_discovered ?? 0}</TableCell>
                        <TableCell className="text-right">{r.agreements_parsed ?? 0}</TableCell>
                        <TableCell className="text-right">{r.rules_inserted ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No ingestion runs yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>credit_transfer_rules breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceBreakdown.data && sourceBreakdown.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source / Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceBreakdown.data.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-mono text-xs">{row.key}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No rules yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
