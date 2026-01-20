import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isV1Institution } from '../_shared/v1Scope.ts';

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

// Normalize key for pattern lookup (lowercase, trimmed)
function normKey(v: string | null | undefined): string {
  return (v || '').trim().toLowerCase();
}

// Known transfer equivalency page patterns by institution (lowercase keys)
// SINGLE SOURCE OF TRUTH - keep in sync with src/lib/institutionUrls.ts
const EQUIVALENCY_PAGE_PATTERNS: Record<string, string> = {
  'tesu': 'https://www.tesu.edu/transfer-credit',
  'wgu': 'https://www.wgu.edu/admissions/transfers.html',
  'excelsior': 'https://www.excelsior.edu/admissions/transfer-credit/',
  'empire': 'https://www.esc.edu/transfer-credit/',
  'cosc': 'https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php',
  'umgc': 'https://www.umgc.edu/admissions/transfer-students',
  'snhu': 'https://www.snhu.edu/admission/transferring-credits',
  'purdue_global': 'https://www.purdueglobal.edu/transfer-students/',
};

// Provider catalog patterns (lowercase keys)
const PROVIDER_CATALOG_PATTERNS: Record<string, string> = {
  'sophia': 'https://www.sophia.org/online-courses',
  'studycom': 'https://study.com/academy/catalog.html',
  'study.com': 'https://study.com/academy/catalog.html',
  'straighterline': 'https://www.straighterline.com/online-college-courses/',
  'saylor': 'https://learn.saylor.org/',
  'modernstates': 'https://modernstates.org/course/',
  'clep': 'https://clep.collegeboard.org/clep-exams',
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
          needs_review: 0,
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
      needs_review: 0,
      errors: 0,
      skipped_non_v1: 0,
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
      
      // V1 SCOPE GUARD: Skip jobs for non-V1 institutions
      if (!isV1Institution(job.target_institution_norm)) {
        console.log(`[evidence-backfill-worker] Skipping non-V1 institution: ${job.target_institution_norm} (${tupleKey})`);
        results.skipped_non_v1++;
        results.details.push({
          tuple: tupleKey,
          status: 'skipped',
          error: `INSTITUTION_NOT_IN_V1_SCOPE: ${job.target_institution_norm}`,
        });
        continue;
      }
      
      try {
        console.log(`[evidence-backfill-worker] Processing: ${tupleKey}`);

        // ============= EVIDENCE DISCOVERY LOGIC =============
        // Use normKey for pattern lookup (lowercase) but keep job values for DB updates (exact case)
        const targetKey = normKey(job.target_institution_norm);
        const providerKey = normKey(job.source_institution_norm);
        
        // Strategy 1: Check if target institution has known equivalency page
        const targetEquivPage = EQUIVALENCY_PAGE_PATTERNS[targetKey];
        
        // Strategy 2: Check if provider has known catalog page
        const providerCatalogPage = PROVIDER_CATALOG_PATTERNS[providerKey];
        
        // For now, we'll use a heuristic approach:
        // If we have known pages for both target and provider, construct a likely evidence URL
        let evidenceUrl: string | null = null;
        let evidenceType: string | null = null;
        let confidence = 0;

        if (targetEquivPage) {
          // Target institution has a known transfer page - use it as evidence
          // Use 'policy_provider_acceptance' to match existing constraint values
          evidenceUrl = targetEquivPage;
          evidenceType = 'policy_provider_acceptance';
          confidence = 0.6; // Medium confidence - page exists but we haven't verified specific course
        } else if (providerCatalogPage) {
          // Provider catalog as secondary evidence
          evidenceUrl = providerCatalogPage;
          evidenceType = 'catalog_statement';
          confidence = 0.4; // Lower confidence - just catalog, not transfer agreement
        }

        // ============= UPDATE JOB STATUS =============
        const now = new Date().toISOString();
        
        // Allowed evidence types (must match DB constraint)
        const allowedEvidenceTypes = new Set([
          'equivalency_page',
          'catalog_page', 
          'policy_provider_acceptance',
          'catalog_statement',
          'course_specific',
          'equivalency_table',
          'other_official',
          'manual',
        ]);
        
        // Refresh cadence by evidence type (days)
        const refreshDaysByType: Record<string, number> = {
          equivalency_page: 60,
          policy_provider_acceptance: 60,
          catalog_page: 90,
          catalog_statement: 90,
          course_specific: 180,
          equivalency_table: 90,
          other_official: 120,
          manual: 365,
        };
        
        // Exponential backoff for re-checks: 30 → 60 → 120 → 180 (cap)
        // checkCount: 0/1 → 30d, 2 → 60d, 3 → 120d, 4+ → 180d
        const getNextCheckDays = (checkCount: number, status: string): number => {
          if (status === 'found') {
            return refreshDaysByType[evidenceType ?? 'catalog_page'] ?? 90;
          }
          // not_found: exponential backoff (use max(checkCount-1, 0) to get exact ladder)
          const backoffDays = Math.min(30 * Math.pow(2, Math.max(checkCount - 1, 0)), 180);
          return backoffDays;
        };
        
        const nextCheck = new Date();
        nextCheck.setDate(nextCheck.getDate() + getNextCheckDays(job.check_count, evidenceUrl ? 'found' : 'not_found'));
        
        // Guard: ensure evidence_type is valid before DB update
        if (evidenceUrl && evidenceType && !allowedEvidenceTypes.has(evidenceType)) {
          console.warn(`[evidence-backfill-worker] Invalid evidence_type "${evidenceType}" for ${tupleKey}, marking needs_review`);
          if (!dry_run) {
            await supabase
              .from('evidence_jobs')
              .update({
                status: 'needs_review',
                error_message: `invalid_evidence_type: ${evidenceType}`,
                last_checked_at: now,
                next_check_at: nextCheck.toISOString(),
                check_count: job.check_count + 1,
                updated_at: now,
              })
              .eq('id', job.id);
          }
          results.processed++;
          results.needs_review++;
          results.details.push({
            tuple: tupleKey,
            status: 'needs_review',
            error: `invalid_evidence_type: ${evidenceType}`,
          });
          continue;
        }

        if (evidenceUrl && confidence >= 0.4) {
          // Evidence candidate found - but must verify rule exists before marking as found
          if (!dry_run) {
            // First, update credit_transfer_rules with evidence AND evidence_type
            const { data: updatedRows, error: updateError } = await supabase
              .from('credit_transfer_rules')
              .update({ 
                evidence_url: evidenceUrl,
                evidence_type: evidenceType,
              })
              .eq('target_institution_norm', job.target_institution_norm)
              .eq('source_institution_norm', job.source_institution_norm)
              .eq('source_course_code_norm', job.source_course_code_norm)
              .select('id');
            
            const count = updatedRows?.length ?? 0;
            
            if (updateError) {
              console.error(`[evidence-backfill-worker] Update error for ${tupleKey}: ${updateError.message}`);
              // Mark job as needs_review with error
              await supabase
                .from('evidence_jobs')
                .update({
                  status: 'needs_review',
                  error_message: `Rule update failed: ${updateError.message}`,
                  last_checked_at: now,
                  check_count: job.check_count + 1,
                  updated_at: now,
                })
                .eq('id', job.id);
              
              results.needs_review++;
              results.details.push({
                tuple: tupleKey,
                status: 'needs_review',
                error: `Rule update failed: ${updateError.message}`,
              });
              results.processed++;
              continue;
            }
            
            // CRITICAL: Check if update affected any rows
            if (!count || count === 0) {
              console.warn(`[evidence-backfill-worker] No rule matched tuple ${tupleKey} (update affected 0 rows)`);
              // Mark job as needs_review - rule doesn't exist
              await supabase
                .from('evidence_jobs')
                .update({
                  status: 'needs_review',
                  error_message: 'no_rule_matched',
                  evidence_url: evidenceUrl,
                  evidence_type: evidenceType,
                  confidence,
                  last_checked_at: now,
                  check_count: job.check_count + 1,
                  updated_at: now,
                })
                .eq('id', job.id);
              
              results.needs_review++;
              results.details.push({
                tuple: tupleKey,
                status: 'needs_review',
                error: 'no_rule_matched',
                evidence_url: evidenceUrl,
              });
              results.processed++;
              continue;
            }
            
            // Success: Rule was updated with evidence + type
            console.log(`[evidence-backfill-worker] ✓ Updated ${count} rule(s) for ${tupleKey} (type: ${evidenceType})`);
            
            // Update job to found
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
          }

          results.found++;
          results.details.push({
            tuple: tupleKey,
            status: 'found',
            evidence_url: evidenceUrl,
            evidence_type: evidenceType!,
          });
        } else {
          // No evidence found - apply exponential backoff
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
        results.processed++;
      }
    }

    console.log(`[evidence-backfill-worker] Complete: processed=${results.processed}, found=${results.found}, not_found=${results.not_found}, needs_review=${results.needs_review}, skipped_non_v1=${results.skipped_non_v1}, errors=${results.errors}`);

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
