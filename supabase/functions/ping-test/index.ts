// Deploy trigger: 2026-01-08T21:06:30Z - minimal test function
Deno.serve(() => new Response("pong", {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/plain"
  }
}));
