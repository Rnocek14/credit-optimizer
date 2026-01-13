// Equivalencies & Transfer Rules Seeder V1 - Seeds both cross_institution_equivalencies AND credit_transfer_rules
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

// Transfer rule structure for credit_transfer_rules table
interface TransferRuleMapping {
  source_institution: string; // SOPHIA, STUDYCOM, CLEP
  source_course_code: string;
  target_course_code: string;
  rule_source: string;
  confidence: number;
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

// Universal transfer rules - source course -> target course patterns
// These are used to populate credit_transfer_rules for any target institution
const TRANSFER_RULE_MAPPINGS: TransferRuleMapping[] = [
  // Sophia courses
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENG-COMP-I-II', target_course_code: 'ENG-101', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-I', target_course_code: 'HIS-113', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-COLLEGE-ALG', target_course_code: 'MAT-121', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-ETHICS', target_course_code: 'PHI-384', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-I', target_course_code: 'ART-101', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PSYCH', target_course_code: 'PSY-101', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-SOC', target_course_code: 'SOC-101', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-HUMAN-BIO', target_course_code: 'BIO-101', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENV-SCI', target_course_code: 'ENV-101', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-PUBLIC-SPEAK', target_course_code: 'COM-209', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MICRO-ECON', target_course_code: 'ECO-211', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MACRO-ECON', target_course_code: 'ECO-212', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-FIN-ACCT', target_course_code: 'ACC-102', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MGT-ACCT', target_course_code: 'ACC-301', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-BUS-LAW', target_course_code: 'BUS-311', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-BUS', target_course_code: 'BUS-101', rule_source: 'ACE Credit', confidence: 0.92 },
  
  // Study.com courses
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MGMT', target_course_code: 'MAN-321', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MKT', target_course_code: 'MAR-301', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-FIN-ACCT', target_course_code: 'ACC-102', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-MGT-ACCT', target_course_code: 'ACC-301', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-MICRO-ECON', target_course_code: 'ECO-211', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-MACRO-ECON', target_course_code: 'ECO-212', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-INFO-SYS', target_course_code: 'CIS-301', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ETH', target_course_code: 'BUS-331', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-CORP-FIN', target_course_code: 'FIN-321', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-LAW', target_course_code: 'BUS-311', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-HR-MGMT', target_course_code: 'HRM-301', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-PROJ-MGMT', target_course_code: 'MAN-341', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-SUPPLY-CHAIN', target_course_code: 'OPM-301', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ANALYTICS', target_course_code: 'BUS-351', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-ENTREPRENEUR', target_course_code: 'ENT-301', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-DIGITAL-MKT', target_course_code: 'MAR-331', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-CONSUMER-BEH', target_course_code: 'MAR-321', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-RESEARCH-METH', target_course_code: 'BUS-401', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATA-DECISIONS', target_course_code: 'BUS-411', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-ENG-COMP-I', target_course_code: 'ENG-101', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-COLLEGE-ALG', target_course_code: 'MAT-121', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-INTRO-PSYCH', target_course_code: 'PSY-101', rule_source: 'ACE Credit', confidence: 0.90 },
];

// Institution-specific adjustments (confidence modifiers)
// Default modifier for new institutions - slightly conservative
const DEFAULT_CONFIDENCE_MODIFIER: Record<string, number> = {
  CLEP: 0.90,
  SOPHIA: 0.85,
  STUDY_COM: 0.80,
  STUDYCOM: 0.80,
};

const INSTITUTION_CONFIDENCE_MODIFIERS: Record<string, Record<string, number>> = {
  COSC: {
    CLEP: 1.0,
    SOPHIA: 0.95,
    STUDY_COM: 0.90,
    STUDYCOM: 0.90,
  },
  WGU: {
    CLEP: 0.95,
    SOPHIA: 0.90,
    STUDY_COM: 0.85,
    STUDYCOM: 0.85,
  },
  TESU: {
    CLEP: 1.0,
    SOPHIA: 0.95,
    STUDY_COM: 0.90,
    STUDYCOM: 0.90,
  },
  EXCELSIOR: {
    CLEP: 0.95,
    SOPHIA: 0.90,
    STUDY_COM: 0.85,
    STUDYCOM: 0.85,
  },
  EMPIRE: {
    CLEP: 0.95,
    SOPHIA: 0.90,
    STUDY_COM: 0.85,
    STUDYCOM: 0.85,
  },
};

// Get active institution codes from policy packs
async function getActiveInstitutionCodes(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const { data, error } = await supabase
    .from('institution_policy_packs')
    .select('institution')
    .eq('status', 'active');
  
  if (error) {
    console.warn('[seed-equivalencies-v1] Failed to fetch active policy packs:', error.message);
    return ['COSC', 'WGU', 'TESU']; // Fallback to original 3
  }
  
  // Return unique institution codes
  return [...new Set((data || []).map(p => p.institution))];
}

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

    // Parse request body for optional filter
    let targetInstitutions: string[] | undefined;
    try {
      const body = await req.json();
      targetInstitutions = body?.target_institutions;
    } catch {
      // No body or invalid JSON - seed all active institutions
    }

    // Determine which institutions to seed
    const institutionCodes = targetInstitutions?.length 
      ? targetInstitutions 
      : await getActiveInstitutionCodes(supabase);

    console.log(`[seed-equivalencies-v1] Starting seeding for: ${institutionCodes.join(', ')}`);

    // Get institution IDs
    const { data: institutions, error: instError } = await supabase
      .from('institutions')
      .select('id, code')
      .in('code', institutionCodes);

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
      equivalencies: { inserted: 0, skipped: 0, errors: [] as string[] },
      transferRules: { inserted: 0, skipped: 0, errors: [] as string[] },
    };

    // Generate equivalencies and transfer rules for each institution
    for (const [instCode, instId] of instMap) {
      console.log(`[seed-equivalencies-v1] Processing ${instCode}...`);
      
      const confModifiers = INSTITUTION_CONFIDENCE_MODIFIERS[instCode] || DEFAULT_CONFIDENCE_MODIFIER;

      // 1. Seed cross_institution_equivalencies
      for (const mapping of UNIVERSAL_MAPPINGS) {
        const altCreditId = altCreditMap.get(`${mapping.source_code}/${mapping.identifier}`);
        
        if (!altCreditId) {
          results.equivalencies.skipped++;
          continue;
        }

        const baseConfidence = mapping.confidence;
        const modifier = confModifiers[mapping.source_code] || 0.9;
        const adjustedConfidence = Math.min(baseConfidence * modifier, 1.0);

        for (const reqArea of mapping.requirement_areas) {
          const equivalency = {
            alt_credit_id: altCreditId,
            institution_id: instId,
            institutional_course_code: null,
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
            results.equivalencies.errors.push(`${instCode}/${reqArea}/${mapping.identifier}: ${error.message}`);
          } else {
            results.equivalencies.inserted++;
          }
        }
      }

      // 2. Seed credit_transfer_rules
      for (const rule of TRANSFER_RULE_MAPPINGS) {
        const modifier = confModifiers[rule.source_institution] || 0.85;
        const adjustedConfidence = Math.min(rule.confidence * modifier, 1.0);

        const transferRule = {
          source_institution: rule.source_institution,
          source_course_code: rule.source_course_code,
          target_institution: instCode,
          target_course_code: rule.target_course_code,
          acceptance_status: 'accepted',
          rule_source: rule.rule_source,
          confidence: adjustedConfidence,
        };

        const { error } = await supabase
          .from('credit_transfer_rules')
          .upsert(transferRule, { 
            onConflict: 'source_institution,source_course_code,target_institution,target_course_code' 
          });

        if (error) {
          results.transferRules.errors.push(`${instCode}/${rule.source_course_code}: ${error.message}`);
        } else {
          results.transferRules.inserted++;
        }
      }
    }

    // Get summaries
    const { data: eqSummary } = await supabase
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

    const { data: ruleSummary } = await supabase
      .from('credit_transfer_rules')
      .select('target_institution')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((row: { target_institution: string }) => {
          counts[row.target_institution] = (counts[row.target_institution] || 0) + 1;
        });
        return { data: counts };
      });

    console.log(`[seed-equivalencies-v1] ✅ Complete.`);
    console.log(`  Equivalencies: ${results.equivalencies.inserted} inserted, ${results.equivalencies.skipped} skipped`);
    console.log(`  Transfer Rules: ${results.transferRules.inserted} inserted, ${results.transferRules.skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        jobName: 'seed-equivalencies-v1',
        results,
        summary: {
          equivalencies: eqSummary,
          transferRules: ruleSummary,
        },
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