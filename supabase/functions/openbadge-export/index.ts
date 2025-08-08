import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ExportBadgeInput = z.object({
  badge: z.object({
    slug: z.string(),
    name: z.string(),
  }),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const input = ExportBadgeInput.parse(body);

    // Generate OpenBadge 2.0 compliant JSON (dry-run)
    const badgeJson = {
      "@context": "https://w3id.org/openbadges/v2",
      "type": "Assertion",
      "id": `https://maya-platform.com/badges/${input.badge.slug}/assertion`,
      "recipient": {
        "type": "email",
        "hashed": false,
        "identity": "demo@example.com"
      },
      "badge": {
        "type": "BadgeClass",
        "id": `https://maya-platform.com/badges/${input.badge.slug}`,
        "name": input.badge.name,
        "description": `This badge certifies completion and mastery of ${input.badge.name} skills on the Maya Learning Platform.`,
        "image": `https://maya-platform.com/badges/${input.badge.slug}/image.png`,
        "criteria": {
          "id": `https://maya-platform.com/badges/${input.badge.slug}/criteria`,
          "narrative": `Demonstrated proficiency in ${input.badge.name} through hands-on projects, assessments, and peer review.`
        },
        "issuer": {
          "type": "Issuer",
          "id": "https://maya-platform.com/issuer",
          "name": "Maya Learning Platform",
          "url": "https://maya-platform.com",
          "email": "badges@maya-platform.com"
        }
      },
      "verification": {
        "type": "hosted",
        "verificationProperty": "id"
      },
      "issuedOn": new Date().toISOString(),
      "expires": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
    };

    return new Response(JSON.stringify({
      mode: 'dry-run',
      badge_json: badgeJson,
      message: 'OpenBadge JSON generated successfully (demo mode)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in openbadge-export function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      mode: 'dry-run'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});