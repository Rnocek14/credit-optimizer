import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface MayaDecision { id: string; decision_type: string; decision_rationale?: string; confidence_score?: number; created_at?: string }

export function MayaNextSteps({ userId }: { userId?: string | null }) {
  const [items, setItems] = useState<MayaDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const id = userId || '2b458624-d498-4cca-a63d-9341cc20e363';
        const { data, error } = await supabase
          .from('maya_decisions')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(3);
        if (error) throw error;
        if (mounted) setItems((data || []).map((d) => ({
          id: d.id,
          decision_type: d.decision_type,
          decision_rationale: d.decision_rationale,
          confidence_score: d.confidence_score,
          created_at: d.created_at
        })));
      } catch {
        if (mounted) setItems([
          { id: '1', decision_type: 'generate_roadmap', decision_rationale: 'High ROI opportunity in Product Management', confidence_score: 0.92 },
          { id: '2', decision_type: 'skill_gap_analysis', decision_rationale: 'Focus on market analysis and discovery', confidence_score: 0.88 },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [userId]);

  const runDemoWorkflow = async () => {
    setRunning(true);
    try {
      const uid = userId || '2b458624-d498-4cca-a63d-9341cc20e363';
      const wf = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: { workflow_template: 'demo-product-transition', user_id: uid, dry_run: true }
      });
      const badges = await supabase.functions.invoke('assign-badges', {
        body: { user_id: uid, dry_run: true }
      });
      const verify = await supabase.functions.invoke('verify-certificate', {
        body: { code: 'demo-123' }
      });
      setResults({ wf: wf.data, badges: badges.data, verify: verify.data });
      localStorage.setItem('day1_done', 'true');
    } catch (e) {
      setResults({ error: String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maya — Next Steps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between">
                <span className="font-medium">{it.decision_type}</span>
                <span className="text-muted-foreground">{Math.round((it.confidence_score || 0.8) * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-3">
          <Button onClick={runDemoWorkflow} disabled={running}>{running ? 'Running...' : 'Run Demo Workflow'}</Button>
          <a href="/plan" className="text-primary text-sm">Open in Plan →</a>
        </div>
        {results && (
          <div className="text-xs text-muted-foreground">
            <div>mode: dry-run</div>
            <pre className="whitespace-pre-wrap break-words max-h-48 overflow-auto">{JSON.stringify(results, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
