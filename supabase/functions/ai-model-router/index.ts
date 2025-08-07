import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_BASE = "https://api.openai.com/v1";

function jsonResponse(body: any, init: ResponseInit = {}) {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  return new Response(JSON.stringify(body), { ...init, headers });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIApiKey) {
    return jsonResponse({ error: "Missing OPENAI_API_KEY secret in Supabase Edge Functions" }, { status: 500 });
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
    } = payload || {};

    // Image generation route
    if (task === "image" || image) {
      const img = image || {};
      const body = {
        model: "gpt-image-1",
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

      const resp = await fetch(`${OPENAI_BASE}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error("ai-model-router image error:", err);
        return jsonResponse({ error: "OpenAI image generation failed", details: err }, { status: 500 });
      }

      const data = await resp.json();
      return jsonResponse({
        route: "image",
        model: body.model,
        images: (data?.data || []).map((d: any) => ({ b64_json: d.b64_json })),
      });
    }

    // Chat / JSON route
    const useJson = task === "json" || !!json_schema;
    const model = (complexity === "high" || json_schema) ? "gpt-4o" : "gpt-4o-mini";

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

    const chatResp = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chatBody),
    });

    if (!chatResp.ok) {
      const err = await chatResp.text();
      console.error("ai-model-router chat error:", err);
      return jsonResponse({ error: "OpenAI chat completion failed", details: err }, { status: 500 });
    }

    const data = await chatResp.json();
    const choice = data?.choices?.[0];

    return jsonResponse({
      route: useJson ? "json" : "chat",
      model,
      message: choice?.message || null,
      usage: data?.usage || null,
    });
  } catch (error) {
    console.error("ai-model-router fatal error:", error);
    return jsonResponse({ error: "Unexpected error", details: String(error) }, { status: 500 });
  }
});
