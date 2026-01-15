import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verified correct Sophia URLs with subject categories
const SOPHIA_URL_FIXES: Record<string, { url: string; title?: string }> = {
  'english-comp-1': { 
    url: 'https://www.sophia.org/online-courses/english-and-communication/english-composition-i/' 
  },
  'english-comp-2': { 
    url: 'https://www.sophia.org/online-courses/english-and-communication/english-composition-ii/' 
  },
  'public-speaking': { 
    url: 'https://www.sophia.org/online-courses/english-and-communication/public-speaking/' 
  },
  'intro-statistics': { 
    url: 'https://www.sophia.org/online-courses/math/introduction-to-statistics/' 
  },
  'microeconomics': { 
    url: 'https://www.sophia.org/online-courses/social-science/microeconomics/' 
  },
  'macroeconomics': { 
    url: 'https://www.sophia.org/online-courses/social-science/macroeconomics/' 
  },
  'business-law': { 
    url: 'https://www.sophia.org/online-courses/business/business-law/' 
  },
  'intro-business': { 
    url: 'https://www.sophia.org/online-courses/business/introduction-to-business/' 
  },
  // Renamed courses
  'accounting-1': { 
    url: 'https://www.sophia.org/online-courses/business/financial-accounting/',
    title: 'Financial Accounting'
  },
  'accounting-2': { 
    url: 'https://www.sophia.org/online-courses/business/managerial-accounting/',
    title: 'Managerial Accounting'
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Array<{ identifier: string; success: boolean; error?: string }> = [];

    for (const [identifier, fix] of Object.entries(SOPHIA_URL_FIXES)) {
      const updateData: Record<string, unknown> = {
        provider_url: fix.url,
        url_status: 'valid',
        url_checked_at: new Date().toISOString(),
        verification_method: 'manual_verified',
        verified_by: 'admin',
        confidence_score: 1.0,
      };

      // Update title if renamed
      if (fix.title) {
        updateData.title = fix.title;
      }

      const { error } = await supabase
        .from('alt_credits')
        .update(updateData)
        .eq('source_code', 'SOPHIA')
        .eq('identifier', identifier);

      if (error) {
        results.push({ identifier, success: false, error: error.message });
      } else {
        results.push({ identifier, success: true });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      message: `Fixed ${successCount} Sophia URLs, ${failedCount} failed`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fixing Sophia URLs:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
