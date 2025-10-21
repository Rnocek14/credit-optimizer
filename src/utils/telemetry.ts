import { supabase } from '@/integrations/supabase/client';

export interface TelemetryEvent {
  task: string;
  scope?: string;
  route?: string;
  complexity?: Record<string, unknown>;
  success?: boolean;
  function_name?: string;
}

// Alt courses telemetry events
export type AltCourseTelemetryTask = 
  | 'alt_course_clicked'
  | 'alt_course_tag_added' 
  | 'alt_course_tag_removed'
  | 'alt_course_resolved'
  | 'alt_resolve_started'
  | 'alt_resolve_succeeded' 
  | 'alt_resolve_failed'
  | 'yt_playlist_import_started'
  | 'yt_playlist_import_completed'
  | 'db_health_checked'
  | 'degree_toggle'
  | 'degree_warnings_open'
  | 'degree_completed_viewed'
  | 'autofill_started'
  | 'autofill_completed'
  | 'autofill_accepted'
  | 'autofill_rejected'
  | 'scenario_saved'
  | 'scenario_loaded'
  | 'scenario_deleted';

export const trackTelemetryEvent = async (event: TelemetryEvent): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('ai_model_usage')
      .insert({
        user_id: user.id,
        task: event.task,
        route: event.route || window.location.pathname,
        success: event.success ?? true,
        function_name: event.function_name || 'client_action',
        complexity: JSON.stringify(event.complexity || {})
      });
  } catch (error) {
    console.error('Failed to track telemetry:', error);
    // Don't throw - telemetry failures shouldn't break user experience
  }
};