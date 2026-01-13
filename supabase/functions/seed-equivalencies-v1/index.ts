// Equivalencies Seeder V1 - Maps alt credits to COSC, WGU, TESU
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Mapping structure: alt_credit identifier -> requirement areas it can satisfy
interface EquivalencyMapping {
  source_code: string;
  identifier: string;
  requirement_areas: string[]; // WRITTEN_COMM, QUANTITATIVE, BUS_CORE, etc.
  credits_awarded: number;
  level: number;
  confidence: number; // 0.0 to 1.0
}

// V1 Mappings - These are generally accepted across COSC, WGU, TESU
const UNIVERSAL_MAPPINGS: EquivalencyMapping[] = [
  // Written Communication
  { source_code: 'CLEP', identifier: 'college-composition', requirement_areas: ['WRITTEN_COMM'], credits_awarded: 6, level: 100, confidence: 0.95 },
  { source_code: 'SOPHIA', identifier: 'english-comp-1', requirement_areas: ['WRITTEN_COMM'], credits_awarded: 3, level: 100, confidence: 0.90 },
  { source_code: 'SOPHIA', identifier: 'english-comp-2', requirement_areas: ['WRITTEN_COMM'], credits_awarded: 3, level: 100, confidence: 0.90 },
  { source_code: 'STUDY_COM', identifier: 'english-comp-1', requirement_areas: ['WRITTEN_COMM'], credits_awarded: 3, level: 100, confidence: 0.85 },
  
  // Quantitative
  { source_code: 'CLEP', identifier: 'college-algebra', requirement_areas: ['QUANTITATIVE'], credits_awarded: 3, level: 100, confidence: 0.95 },
  { source_code: 'SOPHIA', identifier: 'intro-statistics', requirement_areas: ['QUANTITATIVE'], credits_awarded: 3, level: 200, confidence: 0.90 },
  { source_code: 'STUDY_COM', identifier: 'college-algebra', requirement_areas: ['QUANTITATIVE'], credits_awarded: 3, level: 100, confidence: 0.85 },
  
  // Social Science
  { source_code: 'CLEP', identifier: 'intro-psychology', requirement_areas: ['SOCIAL_SCIENCE'], credits_awarded: 3, level: 100, confidence: 0.95 },
  { source_code: 'CLEP', identifier: 'intro-sociology', requirement_areas: ['SOCIAL_SCIENCE'], credits_awarded: 3, level: 100, confidence: 0.95 },
  
  // Economics (Business Core)
  { source_code: 'CLEP', identifier: 'microeconomics', requirement_areas: ['BUS_CORE', 'SOCIAL_SCIENCE'], credits_awarded: 3, level: 200, confidence: 0.95 },
  { source_code: 'CLEP', identifier: 'macroeconomics', requirement_areas: ['BUS_CORE', 'SOCIAL_SCIENCE'], credits_awarded: 3, level: 200, confidence: 0.95 },
  { source_code: 'SOPHIA', identifier: 'microeconomics', requirement_areas: ['BUS_CORE', 'SOCIAL_SCIENCE'], credits_awarded: 3, level: 200, confidence: 0.90 },
  { source_code: 'SOPHIA', identifier: 'macroeconomics', requirement_areas: ['BUS_CORE', 'SOCIAL_SCIENCE'], credits_awarded: 3, level: 200, confidence: 0.90 },
  { source_code: 'STUDY_COM', identifier: 'microeconomics', requirement_areas: ['BUS_CORE', 'SOCIAL_SCIENCE'], credits_awarded: 3, level: 200, confidence: 0.85 },
  { source_code: 'STUDY_COM', identifier: 'macroeconomics', requirement_areas: ['BUS_CORE', 'SOCIAL_SCIENCE'], credits_awarded: 3, level: 200, confidence: 0.85 },
  
  // Accounting (Business Core)
  { source_code: 'CLEP', identifier: 'financial-accounting', requirement_areas: ['BUS_CORE'], credits_awarded: 3, level: 200, confidence: 0.95 },
  { source_code: 'SOPHIA', identifier: 'accounting-1', requirement_areas: ['BUS_CORE'], credits_awarded: 3, level: 200, confidence: 0.90 },
  { source_code: 'SOPHIA', identifier: 'accounting-2', requirement_areas: ['BUS_CORE'], credits_awarded: 3, level: 200, confidence: 0.90 },
  { source_code: 'STUDY_COM', identifier: 'financial-accounting', requirement_areas: ['BUS_CORE'], credits_awarded: 3, level: 200, confidence: 0.85 },
  
  // Business Law (Business Core)
  { source_code: 'CLEP', identifier: 'business-law', requirement_areas: ['BUS_CORE'], credits_awarded: 3, level: 200, confidence: 0.95 },
  { source_code: 'SOPHIA', identifier: 'business-law', requirement_areas: ['BUS_CORE'], credits_awarded: 3, level: 200, confidence: 0.90 },
  
  // Management & Marketing (Business Core)
  { source_code: 'CLEP', identifier: 'principles-management', requirement_areas: ['BUS_CORE'], credits_awarded: 3, level: 300, confidence: 0.95 },
  { source_code: 'CLEP', identifier: 'principles-marketing', requirement_areas: ['BUS_CORE'], credits_awarded: 3, level: 300, confidence: 0.95 },
  
  // Intro Business (Business Core / Elective)
  { source_code: 'SOPHIA', identifier: 'intro-business', requirement_areas: ['BUS_CORE', 'FREE_ELECTIVE'], credits_awarded: 3, level: 100, confidence: 0.90 },
  { source_code: 'STUDY_COM', identifier: 'intro-business', requirement_areas: ['BUS_CORE', 'FREE_ELECTIVE'], credits_awarded: 3, level: 100, confidence: 0.85 },
  
  // Oral Communication
  { source_code: 'SOPHIA', identifier: 'public-speaking', requirement_areas: ['ORAL_COMM'], credits_awarded: 3, level: 100, confidence: 0.90 },
];

// Institution-specific adjustments (confidence modifiers)
const INSTITUTION_CONFIDENCE_MODIFIERS: Record<string, Record<string, number>> = {
  COSC: {
    // COSC is very alt-credit friendly
    CLEP: 1.0,
    SOPHIA: 0.95,
    STUDY_COM: 0.90,
  },
  WGU: {
    // WGU accepts most but has some restrictions
    CLEP: 0.95,
    SOPHIA: 0.90,
    STUDY_COM: 0.85,
  },
  TESU: {
    // TESU is very alt-credit friendly
    CLEP: 1.0,
    SOPHIA: 0.95,
    STUDY_COM: 0.90,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    console.log(`[seed-equivalencies-v1] Starting equivalencies seeding...`);

    // Get institution IDs
    const { data: institutions, error: instError } = await supabase
      .from('institutions')
      .select('id, code')
      .in('code', ['COSC', 'WGU', 'TESU']);

    if (instError) throw new Error(`Failed to fetch institutions: ${instError.message}`);
    
    const instMap = new Map(institutions?.map(i => [i.code, i.id]) || []);
    console.log(`[seed-equivalencies-v1] Found ${instMap.size} institutions`);

    // Get alt_credits IDs
    const { data: altCredits, error: altError } = await supabase
      .from('alt_credits')
      .select('id, source_code, identifier');

    if (altError) throw new Error(`Failed to fetch alt_credits: ${altError.message}`);

    const altCreditMap = new Map(
      altCredits?.map(ac => [`${ac.source_code}/${ac.identifier}`, ac.id]) || []
    );
    console.log(`[seed-equivalencies-v1] Found ${altCreditMap.size} alt credits`);

    const results = {
      inserted: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Generate equivalencies for each institution
    for (const [instCode, instId] of instMap) {
      console.log(`[seed-equivalencies-v1] Processing ${instCode}...`);
      
      const confModifiers = INSTITUTION_CONFIDENCE_MODIFIERS[instCode] || {};

      for (const mapping of UNIVERSAL_MAPPINGS) {
        const altCreditId = altCreditMap.get(`${mapping.source_code}/${mapping.identifier}`);
        
        if (!altCreditId) {
          console.warn(`[seed-equivalencies-v1] Alt credit not found: ${mapping.source_code}/${mapping.identifier}`);
          results.skipped++;
          continue;
        }

        // Calculate institution-specific confidence
        const baseConfidence = mapping.confidence;
        const modifier = confModifiers[mapping.source_code] || 0.9;
        const adjustedConfidence = Math.min(baseConfidence * modifier, 1.0);

        // Create one row per requirement_area
        for (const reqArea of mapping.requirement_areas) {
          const equivalency = {
            alt_credit_id: altCreditId,
            institution_id: instId,
            institutional_course_code: null, // Not using fake codes - requirement_area is the real key
            institutional_course_name: null,
            credits_awarded: mapping.credits_awarded,
            level: mapping.level,
            requirement_area: reqArea,
            gened_category_code: reqArea,
            confidence: adjustedConfidence,
            last_verified_date: new Date().toISOString().split('T')[0],
            source_documentation: 'seed-equivalencies-v1',
            notes: `Auto-generated mapping for ${instCode}`,
          };

          const { error } = await supabase
            .from('cross_institution_equivalencies')
            .upsert(equivalency, { 
              onConflict: 'alt_credit_id,institution_id,requirement_area' 
            });

          if (error) {
            console.error(`[seed-equivalencies-v1] Error:`, error);
            results.errors.push(`${instCode}/${reqArea}/${mapping.identifier}: ${error.message}`);
          } else {
            results.inserted++;
          }
        }
      }
    }

    // Get summary
    const { data: summary } = await supabase
      .from('cross_institution_equivalencies')
      .select('institution_id, institutions!inner(code)')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((row: { institutions: { code: string } }) => {
          const code = row.institutions.code;
          counts[code] = (counts[code] || 0) + 1;
        });
        return { data: counts };
      });

    console.log(`[seed-equivalencies-v1] ✅ Complete. Inserted: ${results.inserted}, Skipped: ${results.skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        jobName: 'seed-equivalencies-v1',
        results,
        summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[seed-equivalencies-v1] ❌ Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
