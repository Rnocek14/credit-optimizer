// Minimal Edge Function test - 2026-01-08
Deno.serve(() => new Response("pong", {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/plain"
  }
}));
