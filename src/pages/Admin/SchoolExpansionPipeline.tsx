/**
 * SchoolExpansionPipeline — unified "Add School → Pipeline → Live Rules" dashboard.
 * Shows each institution's progress across all onboarding stages.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Plus, ArrowRight, CheckCircle2, Clock, AlertCircle,
  FileText, Shield, Zap, BookOpen, Loader2,
} from 'lucide-react';

interface PipelineStage {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: 'done' | 'active' | 'pending' | 'blocked';
  detail?: string;
}

interface SchoolPipelineData {
  code: string;
  name: string;
  type: string;
  discovery_status: string;
  created_at: string;
  // Aggregated from joins
  packStatus: string | null;
  packConfidence: number;
  templateCount: number;
  ruleCount: number;
  candidateCount: number;
  pendingCandidates: number;
}

function getStages(school: SchoolPipelineData): PipelineStage[] {
  const hasPack = !!school.packStatus;
  const packReady = school.packStatus === 'active' || school.packStatus === 'verified';
  const hasTemplates = school.templateCount > 0;
  const hasRules = school.ruleCount > 0;
  const hasCandidates = school.candidateCount > 0;

  return [
    {
      key: 'registered',
      label: 'Registered',
      icon: <Building2 className="h-4 w-4" />,
      status: 'done',
      detail: school.type,
    },
    {
      key: 'policy',
      label: 'Policy Pack',
      icon: <Shield className="h-4 w-4" />,
      status: packReady ? 'done' : hasPack ? 'active' : 'pending',
      detail: hasPack ? `${school.packStatus} · ${(school.packConfidence * 100).toFixed(0)}%` : 'Not started',
    },
    {
      key: 'templates',
      label: 'Templates',
      icon: <BookOpen className="h-4 w-4" />,
      status: hasTemplates ? 'done' : packReady ? 'active' : 'pending',
      detail: hasTemplates ? `${school.templateCount} templates` : packReady ? 'Ready to create' : 'Needs policy pack',
    },
    {
      key: 'rules',
      label: 'Transfer Rules',
      icon: <Zap className="h-4 w-4" />,
      status: hasRules ? 'done' : hasCandidates ? 'active' : 'pending',
      detail: hasRules
        ? `${school.ruleCount} live`
        : hasCandidates
          ? `${school.pendingCandidates} pending review`
          : 'No rules yet',
    },
    {
      key: 'live',
      label: 'Live',
      icon: <CheckCircle2 className="h-4 w-4" />,
      status: hasTemplates && hasRules && packReady ? 'done' : 'pending',
      detail: hasTemplates && hasRules && packReady ? 'Operational' : 'Not ready',
    },
  ];
}

function stageProgress(stages: PipelineStage[]): number {
  const done = stages.filter(s => s.status === 'done').length;
  return Math.round((done / stages.length) * 100);
}

const statusIcon = {
  done: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
  active: <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  blocked: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
};

function SchoolRow({ school }: { school: SchoolPipelineData }) {
  const stages = getStages(school);
  const pct = stageProgress(stages);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{school.code}</span>
              <span className="text-sm text-muted-foreground">· {school.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={pct} className="h-1.5 w-24" />
              <span className="text-xs text-muted-foreground">{pct}%</span>
            </div>
          </div>
          <Badge variant={pct === 100 ? 'default' : pct > 40 ? 'secondary' : 'outline'}>
            {pct === 100 ? 'Live' : pct > 40 ? 'In Progress' : 'Early'}
          </Badge>
        </div>

        <div className="flex gap-1 items-center">
          {stages.map((stage, i) => (
            <div key={stage.key} className="flex items-center">
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs">
                {statusIcon[stage.status]}
                <span className={stage.status === 'done' ? 'text-foreground' : 'text-muted-foreground'}>
                  {stage.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-0.5 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Quick actions based on current stage */}
        <div className="flex gap-2 mt-3">
          {!school.packStatus && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/policy-field-review?institution=${school.code}`}>
                <Shield className="h-3 w-3 mr-1" /> Start Policy Pack
              </Link>
            </Button>
          )}
          {school.packStatus && school.packStatus !== 'active' && school.packStatus !== 'verified' && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/policy-pack-promotion`}>
                <Shield className="h-3 w-3 mr-1" /> Review Pack
              </Link>
            </Button>
          )}
          {school.pendingCandidates > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/transfer-rules">
                <FileText className="h-3 w-3 mr-1" /> Review {school.pendingCandidates} Rules
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchoolExpansionPipeline() {
  const { data: schools, isLoading } = useQuery({
    queryKey: ['admin', 'school-expansion-pipeline'],
    queryFn: async () => {
      // Fetch institutions
      const { data: institutions, error: instErr } = await supabase
        .from('institutions')
        .select('code, name, type, discovery_status, created_at')
        .order('created_at', { ascending: false });
      if (instErr) throw instErr;

      // Fetch policy packs
      const { data: packs } = await supabase
        .from('institution_policy_packs')
        .select('institution, status, confidence_score');

      // Fetch template counts by institution
      const { data: templates } = await supabase
        .from('degree_templates')
        .select('institution_code');

      // Fetch transfer rules by target institution
      const { data: rules } = await supabase
        .from('credit_transfer_rules')
        .select('target_institution');

      // Fetch candidates by target institution
      const { data: candidates } = await supabase
        .from('transfer_rule_candidates')
        .select('target_institution, status');

      // Aggregate
      return (institutions ?? []).map(inst => {
        const pack = (packs ?? []).find(p => p.institution === inst.code);
        const tmplCount = (templates ?? []).filter(t => t.institution_code === inst.code).length;
        const ruleCount = (rules ?? []).filter(r => r.target_institution === inst.code).length;
        const instCandidates = (candidates ?? []).filter(c => c.target_institution === inst.code);

        return {
          code: inst.code,
          name: inst.name,
          type: inst.type ?? 'university',
          discovery_status: inst.discovery_status ?? 'pending',
          created_at: inst.created_at,
          packStatus: pack?.status ?? null,
          packConfidence: pack?.confidence_score ?? 0,
          templateCount: tmplCount,
          ruleCount: ruleCount,
          candidateCount: instCandidates.length,
          pendingCandidates: instCandidates.filter(c => c.status === 'pending').length,
        } as SchoolPipelineData;
      });
    },
    staleTime: 30_000,
  });

  const summary = useMemo(() => {
    if (!schools) return { total: 0, live: 0, inProgress: 0, early: 0 };
    return {
      total: schools.length,
      live: schools.filter(s => stageProgress(getStages(s)) === 100).length,
      inProgress: schools.filter(s => { const p = stageProgress(getStages(s)); return p > 20 && p < 100; }).length,
      early: schools.filter(s => stageProgress(getStages(s)) <= 20).length,
    };
  }, [schools]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">School Expansion Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            End-to-end view: Add School → Policy → Templates → Rules → Live
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/add-institution">
            <Plus className="h-4 w-4 mr-1" /> Add School
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Schools', value: summary.total, color: 'text-foreground' },
          { label: 'Live', value: summary.live, color: 'text-green-600' },
          { label: 'In Progress', value: summary.inProgress, color: 'text-primary' },
          { label: 'Early Stage', value: summary.early, color: 'text-muted-foreground' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* School list */}
      <div className="space-y-3">
        {schools?.map(school => (
          <SchoolRow key={school.code} school={school} />
        ))}
        {!schools?.length && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No institutions yet.</p>
              <Button asChild className="mt-4">
                <Link to="/admin/add-institution">
                  <Plus className="h-4 w-4 mr-1" /> Add Your First School
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
