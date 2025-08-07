import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ModelRouterRequest {
  task: 'chat' | 'json' | 'image';
  messages?: Array<{ role: string; content: string }>;
  prompt?: string;
  json_schema?: any;
  temperature?: number;
  max_tokens?: number;
  complexity?: 'low' | 'medium' | 'high';
  image?: any;
  model_override?: string;
  retry_count?: number;
}

interface ModelRouterResponse {
  route: string;
  model: string;
  message?: any;
  images?: Array<{ b64_json: string }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  request_id: string;
}

interface ModelRouterError {
  error: string;
  details?: string;
  request_id?: string;
}

interface UsageStats {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  totalTokens: number;
  lastUpdated: Date;
}

export const useModelRouter = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ModelRouterResponse | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const { toast } = useToast();

  const callRouter = useCallback(async (
    request: ModelRouterRequest
  ): Promise<ModelRouterResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-model-router', {
        body: request
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to invoke AI model router');
      }

      if (data.error) {
        const errorResponse = data as ModelRouterError;
        throw new Error(errorResponse.details || errorResponse.error);
      }

      const response = data as ModelRouterResponse;
      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "AI Request Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const chatCompletion = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    options?: Partial<ModelRouterRequest>
  ) => {
    return callRouter({
      task: 'chat',
      messages,
      ...options
    });
  }, [callRouter]);

  const jsonCompletion = useCallback(async (
    prompt: string,
    jsonSchema?: any,
    options?: Partial<ModelRouterRequest>
  ) => {
    return callRouter({
      task: 'json',
      prompt,
      json_schema: jsonSchema,
      ...options
    });
  }, [callRouter]);

  const imageGeneration = useCallback(async (
    prompt: string,
    imageOptions?: any,
    options?: Partial<ModelRouterRequest>
  ) => {
    return callRouter({
      task: 'image',
      prompt,
      image: imageOptions,
      ...options
    });
  }, [callRouter]);

  const fetchUsageStats = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ai_model_usage')
        .select('*')
        .eq('function_name', 'ai-model-router')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching usage stats:', fetchError);
        return;
      }

      const totalRequests = data.length;
      const successfulRequests = data.filter(row => row.success).length;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      const averageLatency = data.reduce((sum, row) => sum + (row.latency_ms || 0), 0) / totalRequests || 0;
      const totalTokens = data.reduce((sum, row) => sum + (row.tokens_in || 0) + (row.tokens_out || 0), 0);

      setUsageStats({
        totalRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageLatency: Math.round(averageLatency),
        totalTokens,
        lastUpdated: new Date()
      });
    } catch (err) {
      console.error('Failed to fetch usage stats:', err);
    }
  }, []);

  const retryLastRequest = useCallback(async () => {
    if (!lastResponse) {
      toast({
        title: "No Previous Request",
        description: "There's no previous request to retry",
        variant: "destructive"
      });
      return null;
    }

    toast({
      title: "Retrying Request",
      description: "Attempting to retry the last AI request..."
    });

    // Note: We can't perfectly reconstruct the original request from the response
    // This is a simplified retry that would work for basic cases
    return callRouter({
      task: lastResponse.route as any,
      complexity: 'medium' // Default fallback
    });
  }, [lastResponse, callRouter, toast]);

  return {
    loading,
    error,
    lastResponse,
    usageStats,
    callRouter,
    chatCompletion,
    jsonCompletion,
    imageGeneration,
    fetchUsageStats,
    retryLastRequest
  };
};