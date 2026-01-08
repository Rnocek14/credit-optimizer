// Simple ping test function
Deno.serve(() => new Response("pong", {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/plain"
  }
}));
