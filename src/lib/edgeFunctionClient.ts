import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';


interface EdgeFunctionError {
  error: string;
  message: string;
  missing?: string[];
}

export async function callEdgeFunction<T>(name: string, payload: any): Promise<T> {
  console.log(`[EdgeFunction] Calling ${name} with payload:`, payload);
  
  // Enhanced payload validation - never send empty/null bodies
  let validatedPayload = payload;
  
  // Check for various empty conditions
  if (!payload || 
      payload === null || 
      payload === undefined ||
      (typeof payload === 'object' && Object.keys(payload).length === 0) ||
      (typeof payload === 'string' && payload.trim() === '')) {
    console.warn(`[EdgeFunction] ${name} called with empty/null payload (${typeof payload}), using ping fallback`);
    validatedPayload = { action: 'ping' };
  }
  
  // Ensure payload is serializable and has content
  let serializedPayload: string;
  try {
    serializedPayload = JSON.stringify(validatedPayload);
    if (serializedPayload.length < 3) { // Less than "{}" 
      console.warn(`[EdgeFunction] ${name} payload too small (${serializedPayload.length} chars), using ping fallback`);
      validatedPayload = { action: 'ping' };
      serializedPayload = JSON.stringify(validatedPayload);
    }
  } catch (e) {
    console.error(`[EdgeFunction] ${name} payload serialization failed:`, e);
    validatedPayload = { action: 'ping' };
    serializedPayload = JSON.stringify(validatedPayload);
  }
  
  const user = await getCurrentUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (user?.isDevUser) {
    headers['x-dev-user-id'] = user.id;
    console.log(`[EdgeFunction] Using dev user override: ${user.id}`);
  }
  
  // Enhanced logging for request details
  console.log(`[EdgeFunction] Request details:`, {
    function: name,
    payloadKeys: Object.keys(validatedPayload || {}),
    payloadSize: serializedPayload.length,
    serializedSample: serializedPayload.substring(0, 100),
    hasAuth: !!headers['x-dev-user-id'],
    originalPayloadType: typeof payload,
    wasModified: validatedPayload !== payload
  });
  
  // Double-check before sending - this should never happen but adds extra safety
  if (!validatedPayload || serializedPayload.length < 3) {
    console.error(`[EdgeFunction] Final payload validation failed - emergency ping`);
    validatedPayload = { action: 'ping', emergency: true };
  }
  
  const { data, error } = await supabase.functions.invoke(name, {
    body: validatedPayload,
    headers
  });

  console.log(`[EdgeFunction] ${name} response:`, { 
    error: error ? { name: error.name, message: error.message } : null, 
    hasData: !!data,
    dataKeys: data ? Object.keys(data) : []
  });

  if (error) {
    // Try to extract structured error info with better parsing
    const j = (error as any).context?.json;
    const code = j?.error ?? error.name ?? 'unknown_error';
    const msg = j?.message ?? error.message ?? 'Unknown error';
    const missing = j?.missing as string[] | undefined;
    
    const errorParts = [code, msg];
    if (missing?.length) {
      errorParts.push(`(Missing: ${missing.join(', ')})`);
    }
    
    throw new Error(errorParts.join(': '));
  }

  if (!data) {
    throw new Error('no_data: No data returned from function');
  }

  return data as T;
}
