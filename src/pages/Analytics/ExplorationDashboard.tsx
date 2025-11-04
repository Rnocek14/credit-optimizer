import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Loader2, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { twoProportionZTest } from '@/utils/statisticalSignificance';
import { useExplorationAnalytics } from '@/lib/analytics/useExplorationAnalytics';

export default function ExplorationDashboard() {
  const [moduleCategory, setModuleCategory] = useState<string | null>(null);
  const [planYear, setPlanYear] = useState<number | null>(null);
  const [providerType, setProviderType] = useState<string | null>(null);
  const [since, setSince] = useState<'7 days' | '21 days' | '30 days'>('21 days');
  
  const { data, isLoading, isError } = useExplorationAnalytics({
    since,
    moduleCategory,
    planYear,
    providerType,
  });

  const split = data?.split ?? [];
  const funnel = data?.funnel ?? [];
  const daily = data?.daily ?? [];
  // Transform daily data for trend chart
  const dailySeries = useMemo(() => {
    const byDay: Record<string, { day: string; a?: number; b?: number }> = {};
    for (const r of daily) {
      const d = byDay[r.day] ?? { day: r.day };
      if (r.bucket === 'A') d.a = Number(r.apply_rate_pct);
      if (r.bucket === 'B') d.b = Number(r.apply_rate_pct);
      byDay[r.day] = d;
    }
    return Object.values(byDay).sort((x, y) => x.day.localeCompare(y.day));
  }, [daily]);

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

  if (isError) {
    return (
      <div className="p-6">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold mb-2">Analytics RPCs Not Set Up</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                The analytics database functions haven't been created yet. Please run the SQL setup script to enable analytics.
              </p>
              <div className="bg-muted p-3 rounded-md text-left text-xs font-mono mb-4">
                <p className="text-muted-foreground">Run in Supabase SQL Editor:</p>
                <p className="mt-1">docs/exploration-analytics-slices.sql</p>
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Exploration Mode — Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">A/B test performance with slice filters</p>
          </div>
          <Button variant="secondary" onClick={() => location.reload()}>Refresh</Button>
        </div>
        
        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3">
          <Select value={since} onValueChange={(v) => setSince(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7 days">Last 7 days</SelectItem>
              <SelectItem value="21 days">Last 21 days</SelectItem>
              <SelectItem value="30 days">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={moduleCategory ?? 'all'} onValueChange={(v) => setModuleCategory(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="gen_ed">Gen Ed</SelectItem>
              <SelectItem value="core">Core</SelectItem>
              <SelectItem value="elective">Elective</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={planYear?.toString() ?? 'all'} onValueChange={(v) => setPlanYear(v === 'all' ? null : Number(v))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1">Year 1</SelectItem>
              <SelectItem value="2">Year 2</SelectItem>
              <SelectItem value="3">Year 3</SelectItem>
              <SelectItem value="4">Year 4</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={providerType ?? 'all'} onValueChange={(v) => setProviderType(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="ACE">ACE</SelectItem>
              <SelectItem value="CLEP">CLEP</SelectItem>
              <SelectItem value="NCCRS">NCCRS</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Daily trend chart */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-sm font-medium">Apply Rate Trend (Daily)</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailySeries}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="day" 
                fontSize={12}
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                label={{ value: 'Apply Rate %', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip 
                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                formatter={(val: number) => [`${val.toFixed(1)}%`, '']}
              />
              <Legend />
              <Line 
                dataKey="a" 
                name="Bucket A" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                dataKey="b" 
                name="Bucket B" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function aggregateSplit(rows: Array<{ bucket?: string; users?: number; assignment_events?: number }>) {
  // Map RPC result to chart format
  return rows.map(r => ({
    bucket: r.bucket ?? 'UNK',
    users: r.users ?? 0,
    overrides: Math.max(0, (r.assignment_events ?? 0) - (r.users ?? 0)) // Estimate overrides from delta
  }));
}
