import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';


interface EdgeFunctionError {
  error: string;
  message: string;
  missing?: string[];
}

export async function callEdgeFunction<T>(name: string, payload: any): Promise<T> {
  console.log(`[EdgeFunction] Calling ${name} with payload:`, payload);
  
  // Safety guard: ensure payload is defined and not empty
  if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
    console.warn(`[EdgeFunction] ${name} called with empty/null payload, using minimal fallback`);
    payload = { action: 'ping' }; // Fallback to ping for connectivity test
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
    payloadKeys: Object.keys(payload || {}),
    payloadSize: JSON.stringify(payload).length,
    hasAuth: !!headers['x-dev-user-id']
  });
  
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
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
