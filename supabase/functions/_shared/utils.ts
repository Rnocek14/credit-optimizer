import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// Safe JSON parsing with size limits
export async function safeJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (text.length > 100000) { // 100KB limit
    throw new Error('Request body too large');
  }
  return JSON.parse(text);
}

// Standard response helpers
export function ok(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function fail(status: number, code: string, message: string, meta?: any) {
  return new Response(JSON.stringify({ error: code, message, meta }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Extract user from request
export async function requireUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new Error('Missing authorization token');
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return { user, supabase };
}

// Simple circuit breaker wrapper
export async function withCircuitBreaker<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    const result = await fn();
    return ok(result);
  } catch (error) {
    console.error('Circuit breaker caught error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('authorization') || message.includes('token')) {
      return fail(401, 'unauthorized', message);
    }
    if (message.includes('too large')) {
      return fail(413, 'payload_too_large', message);
    }
    if (message.includes('rate limit')) {
      return fail(429, 'rate_limited', message);
    }
    
    return fail(500, 'internal_error', message);
  }
}

// Basic rate limiting using Postgres
export async function rateLimit(userId: string, key: string, windowSec: number, maxHits: number) {
  const windowStart = new Date(Date.now() - windowSec * 1000);
  
  const { data: hits } = await supabase
    .from('maya_context_tracking')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', windowStart.toISOString())
    .limit(maxHits + 1);

  if (hits && hits.length >= maxHits) {
    throw new Error(`Rate limit exceeded: ${maxHits} requests per ${windowSec}s`);
  }
}