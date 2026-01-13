import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PolicyEvent {
  id: string;
  created_at: string;
  institution: string;
  pack_id: string | null;
  run_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
}

interface SynthesizedEvent {
  id: string;
  created_at: string;
  event_type: string;
  source: 'event' | 'task' | 'pack' | 'diff' | 'finding' | 'override';
  actor_user_id?: string | null;
  payload: Record<string, unknown>;
}

const SCAN_EVENTS = ['scan_started', 'scan_completed', 'scan_failed'];

// Safe date parser that returns 0 for invalid dates
const safeTimestamp = (s?: string | null): number => {
  if (!s) return 0;
  const n = Date.parse(String(s));
  return Number.isFinite(n) ? n : 0;
};

export function usePolicyTimeline(runId: string | null, institution: string | null) {
  // Fetch explicit events from policy_pack_events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['policy-events', runId, institution],
    queryFn: async () => {
      if (!institution) return [];
      
      let query = supabase
        .from('policy_pack_events')
        .select('*')
        .eq('institution', institution)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (runId) {
        query = query.eq('run_id', runId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PolicyEvent[];
    },
    enabled: !!institution,
  });

  // Fetch task for this run (synthesize scan events)
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task-timeline', runId, institution],
    queryFn: async () => {
      if (!runId || !institution) return null;
      const { data, error } = await supabase
        .from('policy_refresh_tasks')
        .select('*')
        .eq('run_id', runId)
        .eq('institution', institution)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!runId && !!institution,
  });

  // Fetch pack for this run
  const { data: pack, isLoading: packLoading } = useQuery({
    queryKey: ['pack-timeline', runId, institution],
    queryFn: async () => {
      if (!runId || !institution) return null;
      const { data, error } = await supabase
        .from('institution_policy_packs')
        .select('*')
        .eq('last_run_id', runId)
        .eq('institution', institution)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!runId && !!institution,
  });

  // Fetch diffs summary with created_at and ordering
  const { data: diffs, isLoading: diffsLoading } = useQuery({
    queryKey: ['diffs-timeline', runId, institution],
    queryFn: async () => {
      if (!runId || !institution) return [];
      const { data, error } = await supabase
        .from('policy_refresh_diffs')
        .select('id, field_name, action, created_at')
        .eq('run_id', runId)
        .eq('institution', institution)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!runId && !!institution,
  });

  // Fetch findings (conflicts) - scoped to recent ones only
  const { data: findings, isLoading: findingsLoading } = useQuery({
    queryKey: ['findings-timeline', institution],
    queryFn: async () => {
      if (!institution) return [];
      const { data, error } = await supabase
        .from('policy_scan_findings')
        .select('id, details, created_at')
        .eq('institution', institution)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) return [];
      return data || [];
    },
    enabled: !!institution,
  });

  // Fetch overrides
  const { data: overrides, isLoading: overridesLoading } = useQuery({
    queryKey: ['overrides-timeline', institution],
    queryFn: async () => {
      if (!institution) return [];
      const { data, error } = await supabase
        .from('ground_truth_overrides')
        .select('*')
        .eq('institution', institution)
        .order('resolved_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data || [];
    },
    enabled: !!institution,
  });

  // Combined loading state
  const isLoading = !!institution && (
    eventsLoading || taskLoading || packLoading || diffsLoading || findingsLoading || overridesLoading
  );

  // Flexible helper: check if explicit event exists with optional predicate
  const hasExplicit = (
    eventType: string, 
    pred?: (e: PolicyEvent) => boolean
  ): boolean => {
    if (!events) return false;
    return events.some(e => 
      e.event_type === eventType && (!pred || pred(e))
    );
  };

  // Safe payload accessor (handles null, string, or non-object payloads)
  const getPayload = (e: PolicyEvent): Record<string, any> => {
    if (e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload)) {
      return e.payload as Record<string, any>;
    }
    return {};
  };

  // Helper: check if any scan event exists
  const hasAnyScanEvent = () => {
    if (!events) return false;
    return events.some(e => SCAN_EVENTS.includes(e.event_type));
  };

  // Synthesize timeline from all sources
  const timeline: SynthesizedEvent[] = [];

  // Add explicit events
  events?.forEach((e) => {
    timeline.push({
      id: e.id,
      created_at: e.created_at,
      event_type: e.event_type,
      source: 'event',
      actor_user_id: e.actor_user_id,
      payload: e.payload || {},
    });
  });

  // Synthesize task events (only if no explicit scan events exist)
  if (task && !hasAnyScanEvent()) {
    if (task.started_at) {
      timeline.push({
        id: `task-started-${task.started_at}`,
        created_at: task.started_at,
        event_type: 'scan_started',
        source: 'task',
        payload: { institution: task.institution },
      });
    }
    if (task.completed_at) {
      timeline.push({
        id: `task-completed-${task.completed_at}`,
        created_at: task.completed_at,
        event_type: task.status === 'failed' ? 'scan_failed' : 'scan_completed',
        source: 'task',
        payload: { 
          status: task.status, 
          reason: task.reason,
          metrics: task.metrics,
        },
      });
    }
  }

  // Synthesize pack created event (check by pack_id)
  if (pack && !hasExplicit('merge_created', e => e.pack_id === pack.id)) {
    timeline.push({
      id: `pack-created-${pack.id}`,
      created_at: pack.created_at,
      event_type: 'merge_created',
      source: 'pack',
      payload: {
        pack_id: pack.id,
        status: pack.status,
        confidence_score: pack.confidence_score,
        blocked_reason: pack.blocked_reason,
        pack_scope: pack.pack_scope,
      },
    });
  }

  // Synthesize diffs written event (only when runId exists to ensure proper scoping)
  if (runId && diffs && diffs.length > 0 && !hasExplicit('diffs_written')) {
    // Get best timestamp: first diff's created_at, or task.completed_at, or pack.created_at
    const diffTimestamp = 
      diffs[0]?.created_at || 
      task?.completed_at || 
      pack?.created_at || 
      new Date().toISOString();

    const diffsByAction = diffs.reduce((acc, d) => {
      const action = String(d.action || 'unknown');
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    timeline.push({
      id: `diffs-${runId}`,
      created_at: diffTimestamp,
      event_type: 'diffs_written',
      source: 'diff',
      payload: {
        total: diffs.length,
        by_action: diffsByAction,
      },
    });
  }

  // Synthesize conflict events from findings (with duplicate protection)
  findings?.forEach((f) => {
    const details = f.details as { has_conflicts?: boolean; conflicts?: Array<{ field: string }> } | null;
    if (details?.has_conflicts && details?.conflicts?.length) {
      // Check if explicit event already exists for this finding (run-scoped if runId exists)
      const hasExplicitConflict = hasExplicit(
        'conflict_detected', 
        e => {
          const p = getPayload(e);
          const matchesFinding = p.finding_id === f.id;
          const matchesRun = !runId || e.run_id === runId;
          return matchesFinding && matchesRun;
        }
      );
      
      if (!hasExplicitConflict) {
        timeline.push({
          id: `conflict-${f.id}`,
          created_at: f.created_at,
          event_type: 'conflict_detected',
          source: 'finding',
          payload: {
            finding_id: f.id,
            conflict_count: details.conflicts.length,
            conflicts: details.conflicts,
          },
        });
      }
    }
  });

  // Synthesize override events (with duplicate protection)
  overrides?.forEach((o) => {
    if (o.resolved_at) {
      // Check if explicit event already exists for this override (run-scoped if runId exists)
      const hasExplicitOverride = hasExplicit(
        'override_set',
        e => {
          const p = getPayload(e);
          const matchesOverride = p.override_id === o.id;
          const matchesRun = !runId || e.run_id === runId;
          return matchesOverride && matchesRun;
        }
      );

      if (!hasExplicitOverride) {
        timeline.push({
          id: `override-${o.id}`,
          created_at: o.resolved_at,
          event_type: 'override_set',
          source: 'override',
          actor_user_id: o.resolved_by,
          payload: {
            override_id: o.id,
            field_name: o.field_name,
            override_value: o.override_value,
            citation_url: o.citation_url,
            note: o.note,
          },
        });
      }
    }
  });

  // Sort by created_at descending with NaN-safe parsing and stable tiebreaker
  timeline.sort((a, b) => {
    const timeDiff = safeTimestamp(b.created_at) - safeTimestamp(a.created_at);
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  const isEmpty = !isLoading && timeline.length === 0;

  return {
    timeline,
    isLoading,
    isEmpty,
  };
}
