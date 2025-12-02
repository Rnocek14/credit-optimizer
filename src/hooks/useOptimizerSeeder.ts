import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SeedResult {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface SeedJobResult {
  jobName: string;
  success: boolean;
  tables: Record<string, SeedResult>;
  tesuInstitutionId?: string;
  error?: string;
  runAt: string;
}

export interface SeedJobState {
  isRunning: boolean;
  lastResult: SeedJobResult | null;
  error: string | null;
}

export interface FunctionHealthStatus {
  name: string;
  reachable: boolean;
  status?: number;
  error?: string;
  responseTime?: number;
}

const STORAGE_KEY = 'optimizer-seeding-results';

function loadStoredResults(): Record<string, SeedJobResult> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveResult(jobName: string, result: SeedJobResult) {
  try {
    const stored = loadStoredResults();
    stored[jobName] = result;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage not available
  }
}

/**
 * Parse error from Supabase functions.invoke for better error messages
 */
function parseInvokeError(error: any, data: any): string {
  // Log full error details for debugging
  console.error('[useOptimizerSeeder] Full error object:', {
    errorMessage: error?.message,
    errorName: error?.name,
    errorStatus: error?.status,
    errorContext: error?.context,
    data,
  });

  // Check for FunctionsHttpError (function returned error status)
  if (error?.name === 'FunctionsHttpError') {
    const status = error?.context?.status || error?.status;
    const statusText = error?.context?.statusText || '';
    return `Edge function error (${status}${statusText ? ': ' + statusText : ''})`;
  }

  // Check for FunctionsRelayError (network/deployment issue)
  if (error?.name === 'FunctionsRelayError') {
    return 'Function not deployed or not reachable. Check Supabase Dashboard → Edge Functions.';
  }

  // Check for FunctionsFetchError (fetch failed entirely)
  if (error?.name === 'FunctionsFetchError' || error?.message?.includes('Failed to fetch')) {
    return 'Network error: Could not reach edge function. Function may not be deployed.';
  }

  // Check if data contains error info
  if (data?.error) {
    return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  }

  // Generic fallback
  return error?.message || 'Unknown error occurred';
}

export function useOptimizerSeeder() {
  const [state, setState] = useState<Record<string, SeedJobState>>(() => {
    const stored = loadStoredResults();
    const initial: Record<string, SeedJobState> = {};
    Object.entries(stored).forEach(([jobName, result]) => {
      initial[jobName] = {
        isRunning: false,
        lastResult: result,
        error: null,
      };
    });
    return initial;
  });

  const runJob = useCallback(async (jobName: string): Promise<SeedJobResult> => {
    const functionName = `optimizer-${jobName}`;
    console.log(`[useOptimizerSeeder] Invoking edge function: ${functionName}`);

    setState(prev => ({
      ...prev,
      [jobName]: { isRunning: true, lastResult: prev[jobName]?.lastResult || null, error: null }
    }));

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {}
      });

      console.log(`[useOptimizerSeeder] Response from ${functionName}:`, { data, error });

      if (error) {
        const errorMsg = parseInvokeError(error, data);
        throw new Error(errorMsg);
      }

      // Check if data indicates failure
      if (data && data.success === false) {
        throw new Error(data.error || 'Seeding job returned success=false');
      }

      const result: SeedJobResult = {
        ...data,
        runAt: new Date().toISOString(),
      };

      saveResult(jobName, result);

      setState(prev => ({
        ...prev,
        [jobName]: { isRunning: false, lastResult: result, error: null }
      }));

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      console.error(`[useOptimizerSeeder] Job ${jobName} failed:`, errorMsg);
      
      setState(prev => ({
        ...prev,
        [jobName]: { 
          isRunning: false, 
          lastResult: prev[jobName]?.lastResult || null, 
          error: errorMsg 
        }
      }));

      throw err;
    }
  }, []);

  /**
   * Health check for edge functions - tests if they're reachable
   */
  const checkFunctionHealth = useCallback(async (functionNames: string[]): Promise<FunctionHealthStatus[]> => {
    const results: FunctionHealthStatus[] = [];

    for (const name of functionNames) {
      const startTime = Date.now();
      try {
        console.log(`[useOptimizerSeeder] Health check: ${name}`);
        
        // Use OPTIONS request or a lightweight invoke
        const { data, error } = await supabase.functions.invoke(name, {
          body: { healthCheck: true }
        });

        const responseTime = Date.now() - startTime;

        if (error) {
          // Even if there's an error, if we got a response the function exists
          const isFetchError = error.name === 'FunctionsFetchError' || 
                              error.message?.includes('Failed to fetch');
          
          results.push({
            name,
            reachable: !isFetchError,
            status: error?.context?.status,
            error: parseInvokeError(error, data),
            responseTime,
          });
        } else {
          results.push({
            name,
            reachable: true,
            status: 200,
            responseTime,
          });
        }
      } catch (err: any) {
        results.push({
          name,
          reachable: false,
          error: err.message || 'Unknown error',
          responseTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }, []);

  const getJobState = useCallback((jobName: string): SeedJobState => {
    return state[jobName] || { isRunning: false, lastResult: null, error: null };
  }, [state]);

  const clearResults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({});
  }, []);

  return {
    runJob,
    getJobState,
    clearResults,
    checkFunctionHealth,
    state,
  };
}
