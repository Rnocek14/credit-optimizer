import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_BASE = "https://api.openai.com/v1";

// Initialize Supabase client for usage logging
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function jsonResponse(body: any, init: ResponseInit = {}) {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  return new Response(JSON.stringify(body), { ...init, headers });
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function logUsage(
  userId: string | null,
  requestId: string,
  task: string,
  route: string,
  model: string | null,
  complexity: string | null,
  latencyMs: number,
  tokensIn: number | null,
  tokensOut: number | null,
  success: boolean,
  errorMessage: string | null = null
) {
  try {
    await supabase
      .from('ai_model_usage')
      .insert({
        user_id: userId || '00000000-0000-0000-0000-000000000000', // Anonymous fallback
        function_name: 'ai-model-router',
        task,
        route,
        model,
        complexity,
        latency_ms: latencyMs,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        success,
        request_id: requestId,
        error_message: errorMessage
      });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Extract user ID from JWT token
  const authHeader = req.headers.get('authorization');
  let userId: string | null = null;
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub || null;
    } catch (error) {
      console.warn('Failed to parse user ID from token:', error);
    }
  }

  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIApiKey) {
    const errorMsg = "Missing OPENAI_API_KEY secret in Supabase Edge Functions";
    await logUsage(userId, requestId, "unknown", "error", null, null, Date.now() - startTime, null, null, false, errorMsg);
    return jsonResponse({ error: errorMsg }, { status: 500 });
  }

  try {
    const payload = await req.json();
    const {
      task = "chat", // chat | json | image
      messages = [],
      prompt,
      json_schema,
      temperature = 0.2,
      max_tokens,
      complexity = "low", // low | medium | high
      image,
      model_override, // Allow runtime model override
      retry_count = 3, // Allow custom retry count
    } = payload || {};

    // Image generation route
    if (task === "image" || image) {
      const img = image || {};
      const modelToUse = model_override || "gpt-image-1";
      const body = {
        model: modelToUse,
        prompt: img.prompt || prompt || "",
        size: img.size || "1024x1024",
        background: img.background || "auto",
        quality: img.quality || "high",
        n: img.n || 1,
        output_format: img.output_format || "png",
        moderation: img.moderation || "auto",
        output_compression: typeof img.output_compression === "number" ? img.output_compression : 100,
        user: img.user || undefined,
      };

      try {
        const resp = await retryWithBackoff(async () => {
          const response = await fetch(`${OPENAI_BASE}/images/generations`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openAIApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
          }
          
          return response;
        }, retry_count);

        const data = await resp.json();
        const latency = Date.now() - startTime;
        
        await logUsage(userId, requestId, task, "image", modelToUse, complexity, latency, null, null, true);
        
        return jsonResponse({
          route: "image",
          model: modelToUse,
          images: (data?.data || []).map((d: any) => ({ b64_json: d.b64_json })),
          request_id: requestId,
        });
      } catch (error) {
        const latency = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        console.error("ai-model-router image error:", errorMessage);
        await logUsage(userId, requestId, task, "image", modelToUse, complexity, latency, null, null, false, errorMessage);
        
        return jsonResponse({ 
          error: "Image generation failed", 
          details: errorMessage,
          request_id: requestId
        }, { status: 500 });
      }
    }

    // Chat / JSON route
    const useJson = task === "json" || !!json_schema;
    const defaultModel = (complexity === "high" || json_schema) ? "gpt-4o" : "gpt-4o-mini";
    const model = model_override || defaultModel;

    const chatBody: any = {
      model,
      messages: messages?.length ? messages : [
        { role: "system", content: "Be precise and concise." },
        { role: "user", content: prompt || "" },
      ],
      temperature,
    };

    if (max_tokens) chatBody.max_tokens = max_tokens;

    if (json_schema) {
      chatBody.response_format = {
        type: "json_schema",
        json_schema: {
          name: "OutputSchema",
          schema: json_schema,
          strict: true,
        },
      };
    } else if (useJson) {
      chatBody.response_format = { type: "json_object" };
    }

    try {
      const chatResp = await retryWithBackoff(async () => {
        const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chatBody),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }
        
        return response;
      }, retry_count);

      const data = await chatResp.json();
      const choice = data?.choices?.[0];
      const usage = data?.usage;
      const latency = Date.now() - startTime;

      await logUsage(
        userId, 
        requestId, 
        task, 
        useJson ? "json" : "chat", 
        model, 
        complexity, 
        latency, 
        usage?.prompt_tokens || null, 
        usage?.completion_tokens || null, 
        true
      );

      return jsonResponse({
        route: useJson ? "json" : "chat",
        model,
        message: choice?.message || null,
        usage: usage || null,
        request_id: requestId,
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error("ai-model-router chat error:", errorMessage);
      await logUsage(userId, requestId, task, useJson ? "json" : "chat", model, complexity, latency, null, null, false, errorMessage);
      
      return jsonResponse({ 
        error: "Chat completion failed", 
        details: errorMessage,
        request_id: requestId
      }, { status: 500 });
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error("ai-model-router fatal error:", errorMessage);
    await logUsage(userId, requestId, "unknown", "error", null, null, latency, null, null, false, errorMessage);
    
    return jsonResponse({ 
      error: "Unexpected error", 
      details: errorMessage,
      request_id: requestId
    }, { status: 500 });
  }
});
