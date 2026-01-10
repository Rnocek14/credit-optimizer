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
      
      // CAPELLA templates - static PDF catalog (SmartCatalog JS-blocked, demoted to priority 9)
      { institution_code: 'CAPELLA', url: 'https://www.capella.edu/sites/default/files/2025-02/capella-catalog-2025.pdf', page_type: 'catalog_pdf', priority: 1 },
      // Keep SmartCatalog as fallbacks at priority 9 (already demoted via migration)
      { institution_code: 'CAPELLA', url: 'https://capella.smartcatalogiq.com/current/academic-catalog/university-policies/credit-for-prior-learning', page_type: 'transfer_policy', priority: 9 },
      { institution_code: 'CAPELLA', url: 'https://capella.smartcatalogiq.com/current/academic-catalog/university-policies/academic-residency', page_type: 'residency_policy', priority: 9 },
      { institution_code: 'CAPELLA', url: 'https://capella.smartcatalogiq.com/current/academic-catalog/university-policies/transfer-credit', page_type: 'transfer_policy', priority: 9 },
      { institution_code: 'CAPELLA', url: 'https://capella.smartcatalogiq.com/current/academic-catalog/general-academic-policies', page_type: 'catalog', priority: 9 },
      { institution_code: 'CAPELLA', url: 'https://www.capella.edu/admissions/transfer-credits/', page_type: 'transfer_info', priority: 9 },
      
      // EMPIRE templates - verified working URLs with global caps (93 transfer / 31 residency)
      // Priority 1: Core catalog pages for transfer credits
      { institution_code: 'EMPIRE', url: 'https://sunyempire.edu/admissions-and-aid/undergraduate-admissions/transfer-admissions.html', page_type: 'transfer_caps', priority: 1 },
      { institution_code: 'EMPIRE', url: 'https://catalog.sunyempire.edu/undergraduate/transfer-credit/', page_type: 'transfer_policy', priority: 1 },
      // Priority 1: Residency-focused pages (31 credits) - VERIFIED WORKING URLs
      { institution_code: 'EMPIRE', url: 'https://lit.sunyempire.edu/degrees-programs/undergraduate-aos/degree-requirements/', page_type: 'degree_requirements', priority: 1 },
      { institution_code: 'EMPIRE', url: 'https://catalog.sunyempire.edu/undergraduate/academic-policies-procedures/degree-credit-residency-policy/', page_type: 'residency_policy', priority: 1 },
      // Priority 2: Fallback pages
      { institution_code: 'EMPIRE', url: 'https://catalog.sunyempire.edu/undergraduate/earning-undergraduate-degree/', page_type: 'degree_info', priority: 2 },
      { institution_code: 'EMPIRE', url: 'https://catalog.sunyempire.edu/pdf/Full%20Catalog%202024-2025.pdf', page_type: 'catalog_pdf', priority: 2 },
      { institution_code: 'EMPIRE', url: 'https://www.sunyempire.edu/media/13661/bachelors-degree-bulletin.pdf', page_type: 'bulletin_pdf', priority: 3 },
      
      // WALDEN templates - handbook + catalog (program-scoped but policy-dense)
      { institution_code: 'WALDEN', url: 'https://academics.waldenu.edu/handbook/registration-admission-enrollment/transfer-credit', page_type: 'transfer_policy', priority: 1 },
      { institution_code: 'WALDEN', url: 'https://academics.waldenu.edu/handbook/transfer-credit-program/undergraduate', page_type: 'transfer_policy', priority: 1 },
      { institution_code: 'WALDEN', url: 'https://academics.waldenu.edu/catalog/home', page_type: 'catalog', priority: 1 },
      // Keep old catalog URLs as fallbacks at priority 9 (already demoted via migration)
      { institution_code: 'WALDEN', url: 'https://catalog.waldenu.edu/content.php?catoid=179&navoid=71377', page_type: 'transfer_policy', priority: 9 },
      { institution_code: 'WALDEN', url: 'https://catalog.waldenu.edu/content.php?catoid=179&navoid=71378', page_type: 'residency_policy', priority: 9 },
      { institution_code: 'WALDEN', url: 'https://www.waldenu.edu/admissions/transfer-of-credit', page_type: 'transfer_info', priority: 9 },
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
