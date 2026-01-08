// Multi-purpose utility function: seeds + content scraper
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

function extractMainContent(html: string, maxLength = 50000): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.substring(0, maxLength);
}

// ========== SCRAPER ACTIONS ==========
async function handlePing() {
  return new Response(
    JSON.stringify({ success: true, message: 'run-seeds is alive', timestamp: new Date().toISOString() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleScrape(url: string) {
  if (!url) {
    return new Response(
      JSON.stringify({ success: false, error: 'URL is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Scraping: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ success: false, error: `HTTP ${response.status} ${response.statusText}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const html = await response.text();
  const content = extractMainContent(html);

  console.log(`Extracted ${content.length} chars from ${url}`);

  return new Response(
    JSON.stringify({
      success: true,
      url,
      contentLength: content.length,
      preview: content.slice(0, 500),
      fullContent: content,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ========== SEED ACTION ==========
async function handleSeed() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    return new Response(
      JSON.stringify({ success: false, error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  console.log('🌱 Starting transfer rules seed...');

  const transferRules = [
    // SOPHIA → TESU (General Education)
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENG-COMP-I-II', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-I', target_institution: 'TESU', target_course_code: 'HIS-113', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-II', target_institution: 'TESU', target_course_code: 'HIS-114', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-COLLEGE-ALG', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-STATISTICS', target_institution: 'TESU', target_course_code: 'STA-201', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-ETHICS', target_institution: 'TESU', target_course_code: 'PHI-384', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-I', target_institution: 'TESU', target_course_code: 'ART-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-II', target_institution: 'TESU', target_course_code: 'ART-102', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PHILO', target_institution: 'TESU', target_course_code: 'PHI-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PSYCH', target_institution: 'TESU', target_course_code: 'PSY-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-SOC', target_institution: 'TESU', target_course_code: 'SOC-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MACROECONOMICS', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MICROECONOMICS', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-HUMAN-BIO', target_institution: 'TESU', target_course_code: 'BIO-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENV-SCI', target_institution: 'TESU', target_course_code: 'ENV-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-CHEM', target_institution: 'TESU', target_course_code: 'CHE-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-PUBLIC-SPEAK', target_institution: 'TESU', target_course_code: 'COM-209', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
    
    // STUDYCOM → TESU (CS Core)
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-INTRO-CS', target_institution: 'TESU', target_course_code: 'COS-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-PYTHON', target_institution: 'TESU', target_course_code: 'COS-161', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-JAVA-PROG', target_institution: 'TESU', target_course_code: 'COS-162', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATA-STRUCT', target_institution: 'TESU', target_course_code: 'COS-265', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-COMP-ARCH', target_institution: 'TESU', target_course_code: 'COS-231', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-CALC-I', target_institution: 'TESU', target_course_code: 'MAT-231', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-CALC-II', target_institution: 'TESU', target_course_code: 'MAT-232', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-DISCRETE-MATH', target_institution: 'TESU', target_course_code: 'MAT-210', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-LINEAR-ALG', target_institution: 'TESU', target_course_code: 'MAT-250', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-PROB-STATS', target_institution: 'TESU', target_course_code: 'STA-215', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-ALGORITHMS', target_institution: 'TESU', target_course_code: 'COS-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-OS', target_institution: 'TESU', target_course_code: 'COS-341', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATABASE', target_institution: 'TESU', target_course_code: 'COS-350', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-NET-FUND', target_institution: 'TESU', target_course_code: 'COS-360', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-SOFTWARE-ENG', target_institution: 'TESU', target_course_code: 'COS-421', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-THEORY-COMP', target_institution: 'TESU', target_course_code: 'COS-311', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-INFO-SEC', target_institution: 'TESU', target_course_code: 'COS-340', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-AI-ML', target_institution: 'TESU', target_course_code: 'COS-470', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-WEB-DEV', target_institution: 'TESU', target_course_code: 'COS-310', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    
    // STUDYCOM → TESU (Business Core)
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MGMT', target_institution: 'TESU', target_course_code: 'MAN-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MKT', target_institution: 'TESU', target_course_code: 'MAR-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-FIN-ACCT', target_institution: 'TESU', target_course_code: 'ACC-102', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-MGT-ACCT', target_institution: 'TESU', target_course_code: 'ACC-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-MICRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-MACRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-INFO-SYS', target_institution: 'TESU', target_course_code: 'CIS-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ETH', target_institution: 'TESU', target_course_code: 'BUS-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-CORP-FIN', target_institution: 'TESU', target_course_code: 'FIN-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-LAW', target_institution: 'TESU', target_course_code: 'BUS-311', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-HR-MGMT', target_institution: 'TESU', target_course_code: 'HRM-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-PROJ-MGMT', target_institution: 'TESU', target_course_code: 'MAN-341', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-SUPPLY-CHAIN', target_institution: 'TESU', target_course_code: 'OPM-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ANALYTICS', target_institution: 'TESU', target_course_code: 'BUS-351', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-ENTREPRENEUR', target_institution: 'TESU', target_course_code: 'ENT-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-DIGITAL-MKT', target_institution: 'TESU', target_course_code: 'MAR-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-CONSUMER-BEH', target_institution: 'TESU', target_course_code: 'MAR-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-RESEARCH-METH', target_institution: 'TESU', target_course_code: 'BUS-401', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
    { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATA-DECISIONS', target_institution: 'TESU', target_course_code: 'BUS-411', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
    
    // TESU Institutional
    { source_institution: 'TESU', source_course_code: 'TESU-CS-CAPSTONE', target_institution: 'TESU', target_course_code: 'COS-495', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00 },
    { source_institution: 'TESU', source_course_code: 'TESU-CS-ETHICS', target_institution: 'TESU', target_course_code: 'COS-420', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00 },
    { source_institution: 'TESU', source_course_code: 'TESU-SR-SEMINAR', target_institution: 'TESU', target_course_code: 'LIB-495', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00 },
    
    // CLEP
    { source_institution: 'CLEP', source_course_code: 'CLEP-COLLEGE-COMP', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', rule_source: 'CLEP', confidence: 1.00 },
    { source_institution: 'CLEP', source_course_code: 'CLEP-CALCULUS', target_institution: 'TESU', target_course_code: 'MAT-231', acceptance_status: 'accepted', rule_source: 'CLEP', confidence: 1.00 },
    { source_institution: 'CLEP', source_course_code: 'CLEP-PSYCH', target_institution: 'TESU', target_course_code: 'PSY-101', acceptance_status: 'accepted', rule_source: 'CLEP', confidence: 1.00 },
    { source_institution: 'CLEP', source_course_code: 'CLEP-SOCIOLOGY', target_institution: 'TESU', target_course_code: 'SOC-101', acceptance_status: 'accepted', rule_source: 'CLEP', confidence: 1.00 },
  ];

  const { count: beforeCount } = await supabase
    .from('credit_transfer_rules')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Before: ${beforeCount || 0} rules in database`);

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const rule of transferRules) {
    const { data: existing } = await supabase
      .from('credit_transfer_rules')
      .select('id')
      .eq('source_institution', rule.source_institution)
      .eq('source_course_code', rule.source_course_code)
      .eq('target_institution', rule.target_institution)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error: insertError } = await supabase
      .from('credit_transfer_rules')
      .insert(rule);

    if (insertError) {
      if (insertError.code === '23505') {
        skipped++;
      } else {
        console.error(`❌ Insert error for ${rule.source_course_code}:`, insertError);
        errors.push(`${rule.source_course_code}: ${insertError.message}`);
      }
    } else {
      inserted++;
    }
  }

  const { count: afterCount } = await supabase
    .from('credit_transfer_rules')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Seed complete: ${inserted} new rules added, ${skipped} skipped (${afterCount} total)`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Seeded transfer rules successfully`,
      stats: {
        total: transferRules.length,
        inserted,
        skipped,
        errors: errors.length,
        beforeCount: beforeCount || 0,
        afterCount: afterCount || 0
      },
      errors: errors.length > 0 ? errors : undefined
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ========== MAIN HANDLER ==========
Deno.serve(async (req: Request) => {
  console.log('run-seeds called:', req.method, new Date().toISOString());

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'seed'; // default to seed for backwards compatibility

    console.log('Action:', action);

    switch (action) {
      case 'ping':
        return handlePing();
      case 'scrape':
        return handleScrape(body.url);
      case 'seed':
      default:
        return handleSeed();
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
