import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Loader2, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { twoProportionZTest } from '@/utils/statisticalSignificance';

type Row = Record<string, any>;

async function fetchView(view: string): Promise<Row[]> {
  try {
    // @ts-ignore - Views are created manually, not in generated types yet
    const { data, error } = await supabase.from(view).select('*');
    if (error) throw error;
    return (data as Row[]) || [];
  } catch (error) {
    console.error(`Error fetching ${view}:`, error);
    throw error; // Re-throw to trigger error state
  }
}

export default function ExplorationDashboard() {
  const [viewsReady, setViewsReady] = useState(true);
  
  const { data: split = [], isLoading: splitLoading, error: splitError } = useQuery({ 
    queryKey: ['ab_split'], 
    queryFn: () => fetchView('analytics_ab_assignments_21d'),
    retry: false
  });
  
  const { data: funnel = [], isLoading: funnelLoading, error: funnelError } = useQuery({ 
    queryKey: ['exploration_funnel'], 
    queryFn: () => fetchView('analytics_exploration_funnel_21d'),
    retry: false
  });
  
  const { data: satisfied = [], isLoading: satisfiedLoading, error: satisfiedError } = useQuery({ 
    queryKey: ['exploration_satisfied'], 
    queryFn: () => fetchView('analytics_exploration_satisfied_21d'),
    retry: false
  });

  const isLoading = splitLoading || funnelLoading || satisfiedLoading;
  const hasError = splitError || funnelError || satisfiedError;
  
  useEffect(() => {
    if (hasError) {
      setViewsReady(false);
    }
  }, [hasError]);

  // Simple deriveds
  const totalUsers = split.reduce((n, r) => n + Number(r.users ?? 0), 0);
  const bucketAData = funnel.find(r => r.bucket === 'A');
  const bucketBData = funnel.find(r => r.bucket === 'B');
  
  const exploredA = bucketAData?.explored ?? 0;
  const appliedA = bucketAData?.applied ?? 0;
  const exploredB = bucketBData?.explored ?? 0;
  const appliedB = bucketBData?.applied ?? 0;
  
  const rateA = bucketAData?.apply_rate_pct ?? 0;
  const rateB = bucketBData?.apply_rate_pct ?? 0;
  const lift = (Number(rateB) - Number(rateA)).toFixed(1);

  // Statistical significance test
  const stats = useMemo(() => {
    if (exploredA === 0 || exploredB === 0) {
      return null;
    }
    return twoProportionZTest(appliedA, exploredA, appliedB, exploredB);
  }, [exploredA, appliedA, exploredB, appliedB]);

  useEffect(() => { 
    document.title = 'Exploration Analytics'; 
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!viewsReady || hasError) {
    return (
      <div className="p-6">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold mb-2">Analytics Views Not Set Up</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                The analytics database views haven't been created yet. Please run the SQL setup script to enable analytics.
              </p>
              <div className="bg-muted p-3 rounded-md text-left text-xs font-mono mb-4">
                <p className="text-muted-foreground">Run in Supabase SQL Editor:</p>
                <p className="mt-1">docs/exploration-analytics-setup.sql</p>
              </div>
              <p className="text-xs text-muted-foreground">
                After running the SQL, regenerate types in Lovable Cloud tab.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Exploration Mode — Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">A/B test performance for satisfied module exploration (last 21 days)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => location.reload()}>Refresh</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Assigned (21d)</div>
            <div className="text-2xl font-semibold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Apply Rate — A</div>
            <div className="text-2xl font-semibold">{rateA}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {appliedA}/{exploredA} conversions
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Apply Rate — B</div>
            <div className="text-2xl font-semibold">{rateB}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {appliedB}/{exploredB} conversions
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Lift (B − A)</div>
                <div className="text-2xl font-semibold">{lift}%</div>
                {stats && (
                  <div className="flex items-center gap-2 mt-2">
                    {stats.isSignificant ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <Badge variant="default" className="text-xs">Significant</Badge>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <Badge variant="secondary" className="text-xs">
                          {stats.sampleSizeAdequate ? 'Not Significant' : 'Need More Data'}
                        </Badge>
                      </>
                    )}
                  </div>
                )}
              </div>
              {stats?.isSignificant && <TrendingUp className="h-8 w-8 text-green-500" />}
            </div>
            {stats && (
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <div>p-value: {stats.pValue.toFixed(4)}</div>
                <div>95% CI: [{(stats.confidenceInterval.lower * 100).toFixed(1)}%, {(stats.confidenceInterval.upper * 100).toFixed(1)}%]</div>
                {!stats.sampleSizeAdequate && (
                  <div className="text-amber-600">
                    Min sample: {stats.minSampleSize} per bucket
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bucket Split */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-sm font-medium">Bucket Split & Overrides</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={aggregateSplit(split)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" name="Users" fill="hsl(var(--primary))" />
              <Bar dataKey="overrides" name="Overrides" fill="hsl(var(--muted))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Explore → Apply by bucket */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-sm font-medium">Explore → Apply (21d)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="explored" name="Explored" fill="hsl(var(--chart-1))" />
              <Bar dataKey="applied" name="Applied" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Satisfied-module exploration success */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-sm font-medium">Satisfied Modules — Exploration Apply Rate</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={satisfied}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Line 
                dataKey="exploration_apply_rate_pct" 
                name="Apply Rate %" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function aggregateSplit(rows: Row[]) {
  // Rows have multiple lines per bucket (overridden true/false). Collapse for users + overrides.
  const map: Record<string, { bucket: string; users: number; overrides: number }> = {};
  for (const r of rows) {
    const b = r.bucket ?? 'UNK';
    if (!map[b]) map[b] = { bucket: b, users: 0, overrides: 0 };
    map[b].users += Number(r.users ?? 0);
    if (r.overridden) map[b].overrides += Number(r.users ?? 0);
  }
  return Object.values(map);
}
