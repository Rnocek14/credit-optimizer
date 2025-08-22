const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-auth, x-dev-user-id',
};

export function json(status: number, body: Record<string, any>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

export function badRequest(msg: string, missing: string[] = []) {
  return json(400, { error: 'bad_request', message: msg, missing });
}

export function unauthorized(msg = 'Unauthorized') {
  return json(401, { error: 'unauthorized', message: msg });
}

export function notFound(msg = 'Not found', details?: Record<string, unknown>) {
  return json(404, { error: 'not_found', message: msg, details });
}

export function forbidden(msg = 'Access denied', details?: Record<string, unknown>) {
  return json(403, { error: 'forbidden', message: msg, details });
}

export function serverError(e: unknown) {
  const message = (e as any)?.message || 'Internal server error';
  return json(500, { error: 'server_error', message });
}

export function success(data: any) {
  return json(200, data);
}