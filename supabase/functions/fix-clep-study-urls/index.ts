import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verified CLEP URLs - the "of" is dropped from URL slugs
const CLEP_URL_FIXES: Record<string, string> = {
  'microeconomics': 'https://clep.collegeboard.org/clep-exams/principles-microeconomics',
  'macroeconomics': 'https://clep.collegeboard.org/clep-exams/principles-macroeconomics',
  'principles-management': 'https://clep.collegeboard.org/clep-exams/principles-management',
  'principles-marketing': 'https://clep.collegeboard.org/clep-exams/principles-marketing',
};

// Study.com verified URLs
const STUDY_URL_FIXES: Record<string, string> = {
  'english-comp-1': 'https://study.com/academy/course/english-204-english-composition-i.html',
  'college-algebra': 'https://study.com/academy/course/math-101-college-algebra.html',
  'intro-business': 'https://study.com/academy/course/intro-to-business-help-and-review.html',
  'financial-accounting': 'https://study.com/academy/course/financial-accounting-help-and-review.html',
  'microeconomics': 'https://study.com/academy/course/economics-102-microeconomics.html',
  'macroeconomics': 'https://study.com/academy/course/economics-103-microeconomics.html',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Array<{ source: string; identifier: string; success: boolean; error?: string }> = [];

    // Fix CLEP URLs
    for (const [identifier, url] of Object.entries(CLEP_URL_FIXES)) {
      const { error } = await supabase
        .from('alt_credits')
        .update({
          provider_url: url,
          url_status: 'valid',
          url_checked_at: new Date().toISOString(),
          verification_method: 'manual_verified',
          verified_by: 'admin',
          confidence_score: 1.0,
          url_notes: null,
        })
        .eq('source_code', 'CLEP')
        .eq('identifier', identifier);

      results.push({ 
        source: 'CLEP', 
        identifier, 
        success: !error, 
        error: error?.message 
      });
    }

    // Fix Study.com URLs  
    for (const [identifier, url] of Object.entries(STUDY_URL_FIXES)) {
      const { error } = await supabase
        .from('alt_credits')
        .update({
          provider_url: url,
          url_status: 'valid',
          url_checked_at: new Date().toISOString(),
          verification_method: 'manual_verified',
          verified_by: 'admin',
          confidence_score: 1.0,
          url_notes: null,
        })
        .eq('source_code', 'STUDY_COM')
        .eq('identifier', identifier);

      results.push({ 
        source: 'STUDY_COM', 
        identifier, 
        success: !error, 
        error: error?.message 
      });
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({
      success: true,
      message: `Fixed ${successCount}/${results.length} URLs`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fixing URLs:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
