// deno-lint-ignore-file no-explicit-any
import { supabase } from './utils.ts';

export interface TelemetryEvent {
  task: string;
  route?: string;
  complexity?: Record<string, any>;
  success?: boolean;
  function_name?: string;
  user_id?: string;
}

export async function trackTelemetryEvent(event: TelemetryEvent): Promise<void> {
  try {
    // For edge functions, user_id should be passed explicitly
    if (!event.user_id) {
      console.warn('Telemetry event missing user_id, skipping');
      return;
    }

    await supabase
      .from('ai_model_usage')
      .insert({
        user_id: event.user_id,
        task: event.task,
        route: event.route || 'edge_function',
        success: event.success ?? true,
        function_name: event.function_name || 'unknown_function',
        complexity: JSON.stringify(event.complexity || {})
      });
  } catch (error) {
    console.error('Failed to track telemetry:', error);
    // Don't throw - telemetry failures shouldn't break user experience
  }
}

// Rate limiting helper using edge_invocations table
export async function checkRateLimit(identifier: string, windowMinutes: number, maxRequests: number): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    // Create edge_invocations table entry for rate limiting
    const { data: recentRequests } = await supabase
      .from('edge_invocations')
      .select('id')
      .eq('identifier', identifier)
      .gte('created_at', windowStart.toISOString())
      .limit(maxRequests + 1);

    return (recentRequests?.length || 0) < maxRequests;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow request if rate limit check fails
  }
}

export async function recordInvocation(identifier: string, metadata: Record<string, any> = {}): Promise<void> {
  try {
    await supabase
      .from('edge_invocations')
      .insert({
        identifier,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to record invocation:', error);
  }
}