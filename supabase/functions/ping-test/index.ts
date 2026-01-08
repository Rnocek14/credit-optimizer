// Ping test edge function - v2
console.log("ping-test function initialized");

Deno.serve((req) => {
  console.log("ping-test called:", new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  return new Response("pong", {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/plain"
    }
  });
});
