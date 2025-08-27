import { supabase } from '@/integrations/supabase/client';

export interface TelemetryEvent {
  task: string;
  route?: string;
  complexity?: Record<string, any>;
  success?: boolean;
  function_name?: string;
}

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