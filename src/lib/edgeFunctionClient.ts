import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';


interface EdgeFunctionError {
  error: string;
  message: string;
  missing?: string[];
}

export async function callEdgeFunction<T>(name: string, payload: any): Promise<T> {
  console.log(`[EdgeFunction] Calling ${name} with payload:`, payload);
  
  const user = await getCurrentUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (user?.isDevUser) {
    headers['x-dev-user-id'] = user.id;
  }
  
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
    headers
  });

  console.log(`[EdgeFunction] ${name} response:`, { error, hasData: !!data });

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
