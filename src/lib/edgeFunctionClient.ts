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
    // Try to extract structured error info
    let errorCode = 'unknown_error';
    let errorMessage = error.message || 'Unknown error';
    
    if (error.context?.json) {
      const jsonError = error.context.json as EdgeFunctionError;
      errorCode = jsonError.error || errorCode;
      errorMessage = jsonError.message || errorMessage;
      
      if (jsonError.missing?.length) {
        errorMessage += ` (Missing: ${jsonError.missing.join(', ')})`;
      }
    }
    
    throw new Error(`${errorCode}: ${errorMessage}`);
  }

  if (!data) {
    throw new Error('no_data: No data returned from function');
  }

  return data as T;
}