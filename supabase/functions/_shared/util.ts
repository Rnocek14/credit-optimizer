// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.67.3";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dev-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

export const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

export function chunkText(input: string, targetSize = 1600, overlap = 200): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < input.length) {
    const end = Math.min(i + targetSize, input.length);
    out.push(input.slice(i, end));
    if (end >= input.length) break;
    i = end - overlap;
    if (i <= 0) i = end;
  }
  return out;
}

export function detectLanguage(path: string): string {
  const ext = (path.split(".").pop() || "").toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
    json: "JSON", md: "Markdown", css: "CSS", scss: "SCSS", html: "HTML",
    py: "Python", java: "Java", cpp: "C++", c: "C", go: "Go", rs: "Rust",
    php: "PHP", rb: "Ruby", sql: "SQL"
  };
  return languageMap[ext] || "Text";
}

export function extractSymbols(content: string, language: string): string[] {
  if (!language.includes("Script")) return [];
  
  const matches = content.match(/(?:function|const|let|var)\s+(\w+)|class\s+(\w+)|interface\s+(\w+)|type\s+(\w+)/g) || [];
  const names = new Set<string>();
  
  for (const match of matches) {
    const name = match.replace(/^(function|const|let|var|class|interface|type)\s+/, "").split(/[=\s(]/)[0];
    if (name && name.length > 2) names.add(name);
  }
  
  return [...names].slice(0, 10);
}

export async function authenticateUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}