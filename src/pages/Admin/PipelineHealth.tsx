import { Link, Navigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { EnhancedErrorBoundary } from '@/components/enhanced/EnhancedErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ALL_INSTITUTIONS,
  COHORT_ORIGINAL_5,
  COHORT_V2_EXPANSION_5,
  cohortOf,
  useFunnelMonthly,
  useGateBlocks,
  usePackPromotionRatios,
  useStamped7d,
  useTemplateInventory,
  useTemplateStampFreshness,
} from '@/shared/lib/api/pipelineHealth';

// ── helpers ──

function ageInDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatAge(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1mo ago' : `${months}mo ago`;
}

function formatPct(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return '—';
  return `${Math.round(ratio * 100)}%`;
}

function ageTone(days: number | null): 'fresh' | 'warn' | 'stale' | 'none' {
  if (days === null) return 'none';
  if (days <= 7) return 'fresh';
  if (days <= 30) return 'warn';
  return 'stale';
}

function ToneBadge({ tone, children }: { tone: 'fresh' | 'warn' | 'stale' | 'none'; children: React.ReactNode }) {
  const cls =
    tone === 'fresh'
      ? 'bg-success/15 text-success border-success/30'
      : tone === 'warn'
      ? 'bg-warning/15 text-warning border-warning/30'
      : tone === 'stale'
      ? 'bg-destructive/15 text-destructive border-destructive/30'
      : 'bg-muted text-muted-foreground border-border';
  return <Badge variant="outline" className={cls}>{children}</Badge>;
}

function ViewCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground font-mono mt-1">
      source: {children}
    </p>
  );
}

// ── sections ──

interface CohortRow {
  institution_code: string;
  scrape_age_days: number | null;
  template_stamp_age_days: number | null;
  successful_scrapes_7d: number;
  templates_active: number;
  templates_stamped_7d: number;
}

function CohortTable({
  title,
  source,
  institutions,
  rows,
}: {
  title: string;
  source: string;
  institutions: readonly string[];
  rows: CohortRow[];
}) {
  const byInst = new Map(rows.map((r) => [r.institution_code, r]));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <ViewCaption>{source}</ViewCaption>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Institution</TableHead>
              <TableHead>Last scrape</TableHead>
              <TableHead>Last template stamp</TableHead>
              <TableHead className="text-right">Scrapes&nbsp;(7d)</TableHead>
              <TableHead className="text-right">Templates stamped&nbsp;(7d)</TableHead>
              <TableHead className="w-20">Investigate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutions.map((code) => {
              const r = byInst.get(code);
              const scrapeAge = r?.scrape_age_days ?? null;
              const stampAge = r?.template_stamp_age_days ?? null;
              return (
                <TableRow key={code}>
                  <TableCell className="font-medium">{code}</TableCell>
                  <TableCell>
                    <ToneBadge tone={ageTone(scrapeAge)}>{formatAge(scrapeAge)}</ToneBadge>
                  </TableCell>
                  <TableCell>
                    <ToneBadge tone={ageTone(stampAge)}>{formatAge(stampAge)}</ToneBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r?.successful_scrapes_7d ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(r?.templates_stamped_7d ?? 0)}/{r?.templates_active ?? 0}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/admin/transfer-scraper?institution=${encodeURIComponent(code)}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PromotionRatiosCard({
  rows,
}: {
  rows: ReturnType<typeof usePackPromotionRatios>['data'];
}) {
  const data = rows ?? [];
  const ordered = ALL_INSTITUTIONS.map(
    (code) => data.find((r) => r.institution_code === code) ?? null
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pack promotion ratio</CardTitle>
        <CardDescription>
          Lifetime vs live (non-deprecated). Live is the operationally meaningful one;
          lifetime is kept for comparison against the v1 baseline.
        </CardDescription>
        <ViewCaption>institution_policy_packs (computed)</ViewCaption>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Institution</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Lifetime</TableHead>
              <TableHead className="text-right">Live</TableHead>
              <TableHead className="text-right">Live count</TableHead>
              <TableHead className="w-20">Investigate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_INSTITUTIONS.map((code, i) => {
              const r = ordered[i];
              const cohort = cohortOf(code);
              return (
                <TableRow key={code}>
                  <TableCell className="font-medium">{code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {cohort === 'original' ? 'Original-5' : 'V2-expansion-5'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPct(r?.pack_promotion_ratio ?? null)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPct(r?.pack_promotion_ratio_live ?? null)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r ? `${r.packs_live_promoted}/${r.packs_live}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/admin/policy-promotion?institution=${encodeURIComponent(code)}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function GateBlocksCard({ rows }: { rows: ReturnType<typeof useGateBlocks>['data'] }) {
  const data = (rows ?? []).filter((r) => (r.packs_blocked ?? 0) > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Gate blocks
        </CardTitle>
        <CardDescription>
          Packs rejected by promotion gates, by institution × reason. Empty = either no blocks or
          promotion was never attempted (per addendum item 5, we can't distinguish these from data alone).
        </CardDescription>
        <ViewCaption>v_pipeline_health_gate_blocks</ViewCaption>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No gate blocks recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Blocked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={`${r.institution_code}-${r.blocked_reason}-${i}`}>
                  <TableCell className="font-medium">{r.institution_code}</TableCell>
                  <TableCell className="font-mono text-xs">{r.blocked_reason ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.packs_blocked ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelCard({ rows }: { rows: ReturnType<typeof useFunnelMonthly>['data'] }) {
  const data = (rows ?? []).slice(0, 30);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly funnel (recent)</CardTitle>
        <CardDescription>
          Scrape → pack → promotion ratios per institution-month. <code>via_validate</code> went
          silent in February (per addendum); watch this column post-cron-revival.
        </CardDescription>
        <ViewCaption>v_pipeline_health_funnel_monthly</ViewCaption>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No funnel rows.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead className="text-right">Scrapes</TableHead>
                <TableHead className="text-right">Packs</TableHead>
                <TableHead className="text-right">Promoted</TableHead>
                <TableHead className="text-right">Merge</TableHead>
                <TableHead className="text-right">Validate</TableHead>
                <TableHead className="text-right">Promo&nbsp;%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={`${r.month}-${r.institution_code}-${i}`}>
                  <TableCell className="font-mono text-xs">
                    {new Date(r.month).toISOString().slice(0, 7)}
                  </TableCell>
                  <TableCell>{r.institution_code}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.scrapes_successful ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.packs_total ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.packs_promoted ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.packs_via_merge ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.packs_via_validate ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPct(r.pack_promotion_ratio)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TemplateInventoryCard({
  rows,
}: {
  rows: ReturnType<typeof useTemplateInventory>['data'];
}) {
  const byInst = new Map((rows ?? []).map((r) => [r.institution_code, r]));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Template inventory</CardTitle>
        <ViewCaption>v_pipeline_health_template_inventory</ViewCaption>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Institution</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Disabled</TableHead>
              <TableHead className="text-right">Changed</TableHead>
              <TableHead className="text-right">Stale&nbsp;30d</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_INSTITUTIONS.map((code) => {
              const r = byInst.get(code);
              return (
                <TableRow key={code}>
                  <TableCell className="font-medium">{code}</TableCell>
                  <TableCell className="text-right tabular-nums">{r?.templates_total ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{r?.templates_active ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r?.templates_disabled ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r?.templates_changed ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r?.templates_stale_30d ?? 0}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── page ──

function PipelineHealthContent() {
  const stamped = useStamped7d();
  const tplFresh = useTemplateStampFreshness();
  const tplInv = useTemplateInventory();
  const funnel = useFunnelMonthly();
  const gateBlocks = useGateBlocks();
  const promo = usePackPromotionRatios();

  const isLoading =
    stamped.isLoading ||
    tplFresh.isLoading ||
    tplInv.isLoading ||
    funnel.isLoading ||
    gateBlocks.isLoading ||
    promo.isLoading;

  const error =
    stamped.error || tplFresh.error || tplInv.error || funnel.error || gateBlocks.error || promo.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Failed to load pipeline health</CardTitle>
          <CardDescription>{String((error as Error).message ?? error)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Build cohort rows joining stamped + template-stamp views.
  const byInstStamp = new Map((stamped.data ?? []).map((r) => [r.institution_code, r]));
  const byInstTpl = new Map((tplFresh.data ?? []).map((r) => [r.institution_code, r]));
  const cohortRows: CohortRow[] = ALL_INSTITUTIONS.map((code) => {
    const s = byInstStamp.get(code);
    const t = byInstTpl.get(code);
    return {
      institution_code: code,
      scrape_age_days: ageInDays(s?.most_recent_stamp ?? null),
      template_stamp_age_days: ageInDays(t?.most_recent_template_stamp ?? null),
      successful_scrapes_7d: s?.successful_scrapes_7d ?? 0,
      templates_active: t?.templates_active ?? 0,
      templates_stamped_7d: t?.templates_stamped_7d ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <CohortTable
        title="Original-5 cohort"
        source="v_pipeline_health_stamped_7d + v_pipeline_health_template_stamp_freshness"
        institutions={COHORT_ORIGINAL_5}
        rows={cohortRows}
      />
      <CohortTable
        title="V2-expansion-5 cohort"
        source="v_pipeline_health_stamped_7d + v_pipeline_health_template_stamp_freshness"
        institutions={COHORT_V2_EXPANSION_5}
        rows={cohortRows}
      />
      <PromotionRatiosCard rows={promo.data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GateBlocksCard rows={gateBlocks.data} />
        <TemplateInventoryCard rows={tplInv.data} />
      </div>
      <FunnelCard rows={funnel.data} />
    </div>
  );
}

export default function PipelineHealth() {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Pipeline Health</h1>
        </div>
        <p className="text-muted-foreground">
          Read-only view over the six <code>v_pipeline_health_*</code> views plus computed pack-promotion ratios.
          Per the addendum: sit with this panel for 24h before patching anything. Patching the same day defeats the purpose.
        </p>
      </div>
      <EnhancedErrorBoundary>
        <PipelineHealthContent />
      </EnhancedErrorBoundary>
    </div>
  );
}
