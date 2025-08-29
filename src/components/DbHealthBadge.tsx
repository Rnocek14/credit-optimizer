import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackTelemetryEvent } from '@/utils/telemetry';

interface HealthState {
  total: number;
  dupes: number;
  loading: boolean;
}

export function DbHealthBadge() {
  const [state, setState] = useState<HealthState>({
    total: 0,
    dupes: 0,
    loading: true
  });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setState(s => ({ ...s, loading: false }));
          return;
        }

        // Try RPC first, fallback to view query
        const { data, error } = await supabase.rpc('get_transcript_health');
        
        if (error) {
          const { data: rows, error: vErr } = await supabase
            .from('v_transcript_health')
            .select('total_tags, duplicate_rows')
            .limit(1);
          
          if (vErr || !rows?.length) throw vErr || new Error('No health rows');
          
          setState({
            total: rows[0].total_tags,
            dupes: rows[0].duplicate_rows,
            loading: false
          });
        } else {
          const result = Array.isArray(data) ? data[0] : data;
          setState({
            total: result?.total_tags ?? 0,
            dupes: result?.duplicate_rows ?? 0,
            loading: false
          });
        }

        trackTelemetryEvent({ task: 'db_health_checked' });
      } catch (error) {
        console.error('Failed to fetch DB health:', error);
        setState(s => ({ ...s, loading: false }));
      }
    };

    fetchHealth();
  }, []);

  if (state.loading) return null;

  const ok = state.dupes === 0;
  const tooltip = ok
    ? `Transcript OK • ${state.total} item(s)`
    : `Transcript issues • ${state.dupes} duplicate row(s)`;

  return (
    <div
      title={tooltip}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        ok 
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
      }`}
    >
      <span>{ok ? '✅ DB Health' : '⚠️ DB Health'}</span>
      <span>•</span>
      <span>{ok ? `${state.total} items` : `${state.dupes} dupes`}</span>
    </div>
  );
}