import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkerRequest {
  batch_size?: number;
  dry_run?: boolean;
}

interface EvidenceJob {
  id: string;
  target_institution_norm: string;
  source_institution_norm: string;
  source_course_code_norm: string;
  status: string;
  check_count: number;
}

// Known transfer equivalency page patterns by institution
const EQUIVALENCY_PAGE_PATTERNS: Record<string, string> = {
  'tesu': 'https://www.tesu.edu/degree-completion/transfer-credit',
  'wgu': 'https://www.wgu.edu/admissions/transfers.html',
  'excelsior': 'https://www.excelsior.edu/admissions/transfer-credit/',
  'empire': 'https://www.esc.edu/transfer-credit/',
  'cosc': 'https://www.charteroak.edu/prospective-students/transfer-credit.php',
};

// Provider catalog patterns
const PROVIDER_CATALOG_PATTERNS: Record<string, string> = {
  'sophia': 'https://www.sophia.org/online-courses',
  'study.com': 'https://study.com/academy/catalog.html',
  'straighterline': 'https://www.straighterline.com/online-college-courses/',
  'saylor': 'https://learn.saylor.org/',
  'modernstates': 'https://modernstates.org/course/',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  try {
    let body: WorkerRequest = {};
    try {
      body = await req.json();
    } catch {
      // No body - use defaults
    }

    const { batch_size = 10, dry_run = false } = body;

    console.log(`[evidence-backfill-worker] Starting: batch_size=${batch_size}, dry_run=${dry_run}`);

    // ============= STEP 1: Fetch queued jobs =============
    const { data: jobs, error: jobsError } = await supabase
      .from('evidence_jobs')
      .select('*')
      .in('status', ['queued', 'needs_review'])
      .lte('next_check_at', new Date().toISOString())
      .order('next_check_at', { ascending: true })
      .limit(batch_size);

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    console.log(`[evidence-backfill-worker] Found ${jobs?.length || 0} jobs to process`);

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No jobs to process',
          processed: 0,
          found: 0,
          not_found: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ============= STEP 2: Mark jobs as processing =============
    if (!dry_run) {
      const jobIds = jobs.map(j => j.id);
      await supabase
        .from('evidence_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .in('id', jobIds);
    }

    // ============= STEP 3: Process each job =============
    const results = {
      processed: 0,
      found: 0,
      not_found: 0,
      errors: 0,
      details: [] as Array<{
        tuple: string;
        status: string;
        evidence_url?: string;
        evidence_type?: string;
        error?: string;
      }>,
    };

    for (const job of jobs as EvidenceJob[]) {
      const tupleKey = `${job.target_institution_norm}|${job.source_institution_norm}|${job.source_course_code_norm}`;
      
      try {
        console.log(`[evidence-backfill-worker] Processing: ${tupleKey}`);

        // ============= EVIDENCE DISCOVERY LOGIC =============
        // Strategy 1: Check if target institution has known equivalency page
        const targetEquivPage = EQUIVALENCY_PAGE_PATTERNS[job.target_institution_norm];
        
        // Strategy 2: Check if provider has known catalog page
        const providerCatalogPage = PROVIDER_CATALOG_PATTERNS[job.source_institution_norm];
        
        // For now, we'll use a heuristic approach:
        // If we have known pages for both target and provider, construct a likely evidence URL
        let evidenceUrl: string | null = null;
        let evidenceType: string | null = null;
        let confidence = 0;

        if (targetEquivPage) {
          // Target institution has a known transfer page - use it as evidence
          evidenceUrl = targetEquivPage;
          evidenceType = 'equivalency_page';
          confidence = 0.6; // Medium confidence - page exists but we haven't verified specific course
        } else if (providerCatalogPage) {
          // Provider catalog as secondary evidence
          evidenceUrl = providerCatalogPage;
          evidenceType = 'catalog_page';
          confidence = 0.4; // Lower confidence - just catalog, not transfer agreement
        }

        // ============= UPDATE JOB STATUS =============
        const now = new Date().toISOString();
        const nextCheck = new Date();
        nextCheck.setDate(nextCheck.getDate() + 30); // Re-check in 30 days

        if (evidenceUrl && confidence >= 0.4) {
          // Evidence found
          if (!dry_run) {
            // Update job
            await supabase
              .from('evidence_jobs')
              .update({
                status: 'found',
                evidence_url: evidenceUrl,
                evidence_type: evidenceType,
                confidence,
                last_checked_at: now,
                next_check_at: nextCheck.toISOString(),
                check_count: job.check_count + 1,
                updated_at: now,
              })
              .eq('id', job.id);

            // Update credit_transfer_rules with evidence (use uppercase norms for matching)
            const targetNormUpper = job.target_institution_norm.toUpperCase();
            const providerNormUpper = job.source_institution_norm.toUpperCase();
            
            await supabase
              .from('credit_transfer_rules')
              .update({
                evidence_url: evidenceUrl,
                updated_at: now,
              })
              .eq('target_institution_norm', targetNormUpper)
              .eq('source_institution_norm', providerNormUpper)
              .eq('source_course_code_norm', job.source_course_code_norm);
          }

          results.found++;
          results.details.push({
            tuple: tupleKey,
            status: 'found',
            evidence_url: evidenceUrl,
            evidence_type: evidenceType!,
          });
        } else {
          // No evidence found
          if (!dry_run) {
            await supabase
              .from('evidence_jobs')
              .update({
                status: 'not_found',
                last_checked_at: now,
                next_check_at: nextCheck.toISOString(),
                check_count: job.check_count + 1,
                updated_at: now,
              })
              .eq('id', job.id);
          }

          results.not_found++;
          results.details.push({
            tuple: tupleKey,
            status: 'not_found',
          });
        }

        results.processed++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[evidence-backfill-worker] Error processing ${tupleKey}:`, error);

        if (!dry_run) {
          await supabase
            .from('evidence_jobs')
            .update({
              status: 'error',
              error_message: errorMsg,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
        }

        results.errors++;
        results.details.push({
          tuple: tupleKey,
          status: 'error',
          error: errorMsg,
        });
      }
    }

    console.log(`[evidence-backfill-worker] Complete: processed=${results.processed}, found=${results.found}, not_found=${results.not_found}, errors=${results.errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[evidence-backfill-worker] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
