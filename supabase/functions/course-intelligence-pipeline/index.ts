import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { courseUrl, action, trackId } = await req.json();

    switch (action) {
      case 'parse_course':
        const mockCourseData = {
          title: extractTitleFromUrl(courseUrl),
          platform: extractPlatformFromUrl(courseUrl),
          skills: ['programming', 'web development'],
          difficulty: 'intermediate',
          trackId: trackId || null,
          trackContext: trackId ? `Recommended for your active track` : 'General recommendation'
        };
        
        return new Response(
          JSON.stringify({ success: true, courseData: mockCourseData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractTitleFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split('/').pop()?.replace(/-/g, ' ') || 'Course';
  } catch {
    return 'Course';
  }
}

function extractPlatformFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('coursera')) return 'coursera';
    if (hostname.includes('udemy')) return 'udemy';
    return 'other';
  } catch {
    return 'unknown';
  }
}