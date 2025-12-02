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
    setState(prev => ({
      ...prev,
      [jobName]: { isRunning: true, lastResult: prev[jobName]?.lastResult || null, error: null }
    }));

    try {
      const { data, error } = await supabase.functions.invoke(`optimizer-${jobName}`, {
        body: {}
      });

      if (error) throw error;

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
    state,
  };
}
