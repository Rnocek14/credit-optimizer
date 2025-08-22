const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export function notFound(msg = 'Not found', details?: any) {
  return json(404, { error: 'not_found', message: msg, details });
}

export function forbidden(msg = 'Access denied', details?: any) {
  return json(403, { error: 'forbidden', message: msg, details });
}

export function serverError(e: unknown) {
  const message = (e as any)?.message || 'Internal server error';
  return json(500, { error: 'server_error', message });
}

export function success(data: any) {
  return json(200, data);
}