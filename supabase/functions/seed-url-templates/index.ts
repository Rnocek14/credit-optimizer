import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const templates = [
      // WCU templates - using distinct URLs to avoid dedup conflicts
      { institution_code: 'WCU', url: 'https://catalog.wcu.edu/', page_type: 'catalog', priority: 1 },
      { institution_code: 'WCU', url: 'https://www.wcu.edu/learn/admissions/undergraduate/transfer-students.aspx', page_type: 'transfer_info', priority: 1 },
      { institution_code: 'WCU', url: 'https://www.wcu.edu/learn/registrar/transfer-credits.aspx', page_type: 'transfer_policy', priority: 1 },
      { institution_code: 'WCU', url: 'https://www.wcu.edu/learn/registrar/faq.aspx', page_type: 'transfer_faq', priority: 3 },
      { institution_code: 'WCU', url: 'https://www.wcu.edu/learn/registrar/', page_type: 'residency', priority: 3 },
      // EMPIRE templates
      { institution_code: 'EMPIRE', url: 'https://catalog.esc.edu/', page_type: 'catalog', priority: 1 },
      { institution_code: 'EMPIRE', url: 'https://www.esc.edu/admissions/transfer-credit/', page_type: 'transfer_policy', priority: 1 },
      { institution_code: 'EMPIRE', url: 'https://www.esc.edu/admissions/', page_type: 'transfer_info', priority: 2 },
      { institution_code: 'EMPIRE', url: 'https://www.esc.edu/admissions/faq/', page_type: 'transfer_faq', priority: 3 },
      { institution_code: 'EMPIRE', url: 'https://www.esc.edu/registrar/', page_type: 'residency', priority: 3 },
      { institution_code: 'EMPIRE', url: 'https://www.esc.edu/tuition-financial-aid/tuition/', page_type: 'tuition', priority: 4 },
    ];

    const { data, error } = await supabase
      .from('scrape_url_templates')
      .upsert(templates, { onConflict: 'institution_code,url', ignoreDuplicates: true })
      .select();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, inserted: data?.length || 0, templates: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
