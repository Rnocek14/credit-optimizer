import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';

interface EdgeFunctionError {
  error: string;
  message: string;
  missing?: string[];
}

// Global circuit breaker instance for edge function calls
let circuitBreakerInstance: any = null;

export function initializeCircuitBreaker(instance: any) {
  circuitBreakerInstance = instance;
}

export async function callEdgeFunction<T>(name: string, payload: any): Promise<T> {
  console.log(`🚀 Calling edge function: ${name}`, {
    name,
    payload: payload ? JSON.stringify(payload).substring(0, 200) + '...' : 'null',
    timestamp: new Date().toISOString()
  });

  // Use circuit breaker if available
  if (circuitBreakerInstance) {
    return circuitBreakerInstance.executeWithCircuitBreaker(
      name,
      () => executeEdgeFunction<T>(name, payload),
      () => {
        throw new Error(`Service ${name} is temporarily unavailable. Please try again later.`);
      }
    );
  }

  return executeEdgeFunction<T>(name, payload);
}

async function executeEdgeFunction<T>(name: string, payload: any): Promise<T> {
  // Enhanced payload validation - never send empty/null bodies
  let validatedPayload = payload;
  
  // Validate and sanitize payload with timeout
  if (!payload || typeof payload !== 'object') {
    console.warn('⚠️ Invalid payload provided, using ping fallback');
    validatedPayload = { action: 'ping', timestamp: Date.now() };
  } else {
    // Ensure payload is serializable
    try {
      JSON.stringify(payload);
    } catch (e) {
      console.warn('⚠️ Payload not serializable, using ping fallback');
      validatedPayload = { action: 'ping', timestamp: Date.now() };
    }
  }

  // Add request timeout and retry metadata
  validatedPayload = {
    ...validatedPayload,
    _metadata: {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      clientVersion: '1.0.0'
    }
  };
  
  
  const user = await getCurrentUser();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (user?.isDevUser) {
    requestHeaders['x-dev-user-id'] = user.id;
    console.log(`🔑 Using dev user override: ${user.id}`);
  }
  
  try {
    // Add timeout to edge function calls
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('EDGE_FUNCTION_TIMEOUT')), 30000);
    });

    const invokePromise = supabase.functions.invoke(name, {
      body: validatedPayload,
      headers: requestHeaders
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

    console.log(`✅ ${name} response:`, { 
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
  } catch (error) {
    console.error(`❌ ${name} failed:`, error);
    throw error;
  }
}
