// Alt-Credits Catalog Seeder V1 - CLEP, Sophia, Study.com
// CRITICAL: Never overwrites provider_url when url_status is 'valid'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface AltCredit {
  source_code: 'CLEP' | 'DSST' | 'SOPHIA' | 'STUDY_COM';
  identifier: string;
  title: string;
  description?: string;
  credits_typical: number;
  level?: number;
  subject_area?: string;
  cost_usd?: number;
  duration_estimate_weeks?: number;
  exam_based?: boolean;
  provider_url?: string;
  // New fields for verification status
  url_status?: string;
  verification_method?: string;
}

// V1 Catalog - High-value BSBA-focused items
// URLs are seeded as 'unknown' - verification worker will validate them
const ALT_CREDITS_CATALOG: AltCredit[] = [
  // === CLEP Exams (exam-based, proctored) ===
  // CLEP URLs are stable and well-structured
  {
    source_code: 'CLEP',
    identifier: 'college-composition',
    title: 'College Composition',
    description: 'Covers freshman-level college composition skills',
    credits_typical: 6,
    level: 100,
    subject_area: 'WRITTEN_COMM',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/college-composition',
  },
  {
    source_code: 'CLEP',
    identifier: 'college-algebra',
    title: 'College Algebra',
    description: 'Covers basic algebraic operations through quadratic formulas',
    credits_typical: 3,
    level: 100,
    subject_area: 'QUANTITATIVE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/college-algebra',
  },
  {
    source_code: 'CLEP',
    identifier: 'intro-psychology',
    title: 'Introductory Psychology',
    description: 'Covers material typically taught in a one-semester intro psychology course',
    credits_typical: 3,
    level: 100,
    subject_area: 'SOCIAL_SCIENCE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/introductory-psychology',
  },
  {
    source_code: 'CLEP',
    identifier: 'intro-sociology',
    title: 'Introductory Sociology',
    description: 'Covers material typically taught in a one-semester intro sociology course',
    credits_typical: 3,
    level: 100,
    subject_area: 'SOCIAL_SCIENCE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/introductory-sociology',
  },
  {
    source_code: 'CLEP',
    identifier: 'microeconomics',
    title: 'Principles of Microeconomics',
    description: 'Covers principles of economics at individual/firm level',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/principles-of-microeconomics',
  },
  {
    source_code: 'CLEP',
    identifier: 'macroeconomics',
    title: 'Principles of Macroeconomics',
    description: 'Covers principles of economics at national/global level',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/principles-of-macroeconomics',
  },
  {
    source_code: 'CLEP',
    identifier: 'financial-accounting',
    title: 'Financial Accounting',
    description: 'Covers skills and concepts of first-semester financial accounting',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/financial-accounting',
  },
  {
    source_code: 'CLEP',
    identifier: 'business-law',
    title: 'Introductory Business Law',
    description: 'Covers legal environment of business operations',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/introductory-business-law',
  },
  {
    source_code: 'CLEP',
    identifier: 'principles-management',
    title: 'Principles of Management',
    description: 'Covers management theories, functions, and contemporary issues',
    credits_typical: 3,
    level: 300,
    subject_area: 'BUS_CORE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/principles-of-management',
  },
  {
    source_code: 'CLEP',
    identifier: 'principles-marketing',
    title: 'Principles of Marketing',
    description: 'Covers marketing principles and strategies',
    credits_typical: 3,
    level: 300,
    subject_area: 'BUS_CORE',
    cost_usd: 90,
    exam_based: true,
    provider_url: 'https://clep.collegeboard.org/clep-exams/principles-of-marketing',
  },

  // === Sophia Learning (self-paced, no proctoring) ===
  // NOTE: Sophia URLs need verification - structure may include category prefix
  // These are seeded with url_status='unknown' and will be verified by worker
  {
    source_code: 'SOPHIA',
    identifier: 'english-comp-1',
    title: 'English Composition I',
    description: 'Foundational writing skills and essay composition',
    credits_typical: 3,
    level: 100,
    subject_area: 'WRITTEN_COMM',
    cost_usd: 99,
    duration_estimate_weeks: 4,
    exam_based: false,
    // URL may be: /english-and-communication/english-composition-i
    provider_url: 'https://www.sophia.org/online-courses/english-composition-i',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'english-comp-2',
    title: 'English Composition II',
    description: 'Advanced writing and research skills',
    credits_typical: 3,
    level: 100,
    subject_area: 'WRITTEN_COMM',
    cost_usd: 99,
    duration_estimate_weeks: 4,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/english-composition-ii',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'intro-statistics',
    title: 'Introduction to Statistics',
    description: 'Descriptive and inferential statistics fundamentals',
    credits_typical: 3,
    level: 200,
    subject_area: 'QUANTITATIVE',
    cost_usd: 99,
    duration_estimate_weeks: 6,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/introduction-to-statistics',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'microeconomics',
    title: 'Microeconomics',
    description: 'Economic principles at individual and firm level',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 99,
    duration_estimate_weeks: 5,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/microeconomics',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'macroeconomics',
    title: 'Macroeconomics',
    description: 'Economic principles at national and global level',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 99,
    duration_estimate_weeks: 5,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/macroeconomics',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'accounting-1',
    title: 'Accounting I',
    description: 'Financial accounting principles and practices',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 99,
    duration_estimate_weeks: 6,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/accounting-i',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'accounting-2',
    title: 'Accounting II',
    description: 'Managerial accounting and cost analysis',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 99,
    duration_estimate_weeks: 6,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/accounting-ii',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'business-law',
    title: 'Business Law',
    description: 'Legal environment of business',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 99,
    duration_estimate_weeks: 5,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/business-law',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'intro-business',
    title: 'Introduction to Business',
    description: 'Overview of business operations, management, and strategy',
    credits_typical: 3,
    level: 100,
    subject_area: 'BUS_CORE',
    cost_usd: 99,
    duration_estimate_weeks: 4,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/introduction-to-business',
    url_status: 'unknown',
  },
  {
    source_code: 'SOPHIA',
    identifier: 'public-speaking',
    title: 'Public Speaking',
    description: 'Oral communication and presentation skills',
    credits_typical: 3,
    level: 100,
    subject_area: 'ORAL_COMM',
    cost_usd: 99,
    duration_estimate_weeks: 4,
    exam_based: false,
    provider_url: 'https://www.sophia.org/online-courses/public-speaking',
    url_status: 'unknown',
  },

  // === Study.com (video-based, proctored exams) ===
  // NOTE: Study.com URLs can change - always verify before displaying
  {
    source_code: 'STUDY_COM',
    identifier: 'english-comp-1',
    title: 'English Composition I',
    description: 'College-level writing and composition',
    credits_typical: 3,
    level: 100,
    subject_area: 'WRITTEN_COMM',
    cost_usd: 199,
    duration_estimate_weeks: 4,
    exam_based: true,
    provider_url: 'https://study.com/academy/course/english-composition-i.html',
    url_status: 'unknown',
  },
  {
    source_code: 'STUDY_COM',
    identifier: 'college-algebra',
    title: 'College Algebra',
    description: 'Algebraic concepts and problem solving',
    credits_typical: 3,
    level: 100,
    subject_area: 'QUANTITATIVE',
    cost_usd: 199,
    duration_estimate_weeks: 5,
    exam_based: true,
    provider_url: 'https://study.com/academy/course/college-algebra.html',
    url_status: 'unknown',
  },
  {
    source_code: 'STUDY_COM',
    identifier: 'intro-business',
    title: 'Introduction to Business',
    description: 'Fundamentals of business operations',
    credits_typical: 3,
    level: 100,
    subject_area: 'BUS_CORE',
    cost_usd: 199,
    duration_estimate_weeks: 4,
    exam_based: true,
    provider_url: 'https://study.com/academy/course/intro-to-business.html',
    url_status: 'unknown',
  },
  {
    source_code: 'STUDY_COM',
    identifier: 'financial-accounting',
    title: 'Financial Accounting',
    description: 'Principles of financial accounting',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 199,
    duration_estimate_weeks: 6,
    exam_based: true,
    provider_url: 'https://study.com/academy/course/financial-accounting.html',
    url_status: 'unknown',
  },
  {
    source_code: 'STUDY_COM',
    identifier: 'microeconomics',
    title: 'Principles of Microeconomics',
    description: 'Microeconomic theory and applications',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 199,
    duration_estimate_weeks: 5,
    exam_based: true,
    provider_url: 'https://study.com/academy/course/principles-of-microeconomics.html',
    url_status: 'unknown',
  },
  {
    source_code: 'STUDY_COM',
    identifier: 'macroeconomics',
    title: 'Principles of Macroeconomics',
    description: 'Macroeconomic theory and policy',
    credits_typical: 3,
    level: 200,
    subject_area: 'BUS_CORE',
    cost_usd: 199,
    duration_estimate_weeks: 5,
    exam_based: true,
    provider_url: 'https://study.com/academy/course/principles-of-macroeconomics.html',
    url_status: 'unknown',
  },
];

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

    console.log(`[seed-alt-credits-v1] Starting alt-credits catalog seeding...`);
    console.log(`[seed-alt-credits-v1] Total items to seed: ${ALT_CREDITS_CATALOG.length}`);

    const results = {
      inserted: 0,
      skipped_valid: 0, // Skipped because already valid
      updated: 0,
      errors: [] as string[],
    };

    for (const item of ALT_CREDITS_CATALOG) {
      // CRITICAL: Check if record exists and has valid URL status
      const { data: existing } = await supabase
        .from('alt_credits')
        .select('id, url_status, provider_url')
        .eq('source_code', item.source_code)
        .eq('identifier', item.identifier)
        .single();

      if (existing) {
        // Record exists - check if we should skip or update
        if (existing.url_status === 'valid') {
          // NEVER overwrite a validated URL
          console.log(`[seed-alt-credits-v1] ⏭️ Skipping ${item.source_code}/${item.identifier} - already valid`);
          results.skipped_valid++;
          continue;
        }

        // Update non-URL fields only, preserve existing URL if different from seed
        // Only update URL if currently null/empty or status is 'invalid'/'unknown'
        const updateData: Record<string, unknown> = {
          title: item.title,
          description: item.description,
          credits_typical: item.credits_typical,
          level: item.level,
          subject_area: item.subject_area,
          cost_usd: item.cost_usd,
          duration_estimate_weeks: item.duration_estimate_weeks,
          exam_based: item.exam_based,
        };

        // Only update URL if there's no existing URL or status allows it
        if (!existing.provider_url || existing.url_status === 'invalid' || existing.url_status === 'unknown' || !existing.url_status) {
          updateData.provider_url = item.provider_url;
          updateData.url_status = item.url_status || 'unknown';
        }

        const { error } = await supabase
          .from('alt_credits')
          .update(updateData)
          .eq('id', existing.id);

        if (error) {
          console.error(`[seed-alt-credits-v1] Error updating ${item.source_code}/${item.identifier}:`, error);
          results.errors.push(`${item.source_code}/${item.identifier}: ${error.message}`);
        } else {
          results.updated++;
          console.log(`[seed-alt-credits-v1] 🔄 Updated ${item.source_code}/${item.identifier}`);
        }
      } else {
        // New record - insert with initial url_status
        const { error } = await supabase
          .from('alt_credits')
          .insert({
            ...item,
            url_status: item.url_status || 'unknown',
          });

        if (error) {
          console.error(`[seed-alt-credits-v1] Error inserting ${item.source_code}/${item.identifier}:`, error);
          results.errors.push(`${item.source_code}/${item.identifier}: ${error.message}`);
        } else {
          results.inserted++;
          console.log(`[seed-alt-credits-v1] ✅ Inserted ${item.source_code}/${item.identifier}`);
        }
      }
    }

    // Get summary by source
    const { data: summary } = await supabase
      .from('alt_credits')
      .select('source_code, url_status')
      .then(({ data }) => {
        const counts: Record<string, { total: number; valid: number; unknown: number; needs_review: number; invalid: number }> = {};
        (data || []).forEach((row: { source_code: string; url_status: string | null }) => {
          if (!counts[row.source_code]) {
            counts[row.source_code] = { total: 0, valid: 0, unknown: 0, needs_review: 0, invalid: 0 };
          }
          counts[row.source_code].total++;
          const status = row.url_status || 'unknown';
          if (status in counts[row.source_code]) {
            counts[row.source_code][status as keyof typeof counts[string]]++;
          }
        });
        return { data: counts };
      });

    console.log(`[seed-alt-credits-v1] ✅ Complete.`);
    console.log(`[seed-alt-credits-v1] Inserted: ${results.inserted}, Updated: ${results.updated}, Skipped (valid): ${results.skipped_valid}`);

    return new Response(
      JSON.stringify({
        success: true,
        jobName: 'seed-alt-credits-v1',
        results,
        summary,
        message: `Seeded ${results.inserted} new, updated ${results.updated}, skipped ${results.skipped_valid} valid URLs`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[seed-alt-credits-v1] ❌ Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
