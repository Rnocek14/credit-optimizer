// =============================================================================
// VALIDATE-TRANSFER-CANDIDATES — V2 Validation Layer
// =============================================================================
// Sits between AI extraction and auto-promotion. Validates each pending
// candidate against real catalog data, course code formats, provider
// normalization, and title similarity before allowing promotion.
//
// Can be called:
//   1. Automatically after generate-transfer-rules (batch_id)
//   2. Manually via admin to re-validate pending candidates
//   3. Via cron to sweep unvalidated candidates
//
// Inputs:
//   - batch_id: validate all candidates in a batch
//   - candidate_ids: validate specific candidates
//   - auto_promote_threshold: validation_score above which to promote (default 0.80)
//   - dry_run: if true, compute scores but don't promote
//
// Output: { validated, promoted, flagged, results[] }
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// KNOWN PROVIDER CODES — must match providerNormalization.ts
// ---------------------------------------------------------------------------
const KNOWN_PROVIDERS = new Set([
  'SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'CLEP', 'AP', 'DSST',
  'SAYLOR', 'TESU', 'COSC', 'WGU', 'TECEP', 'EXCELSIOR',
]);

// Course code format patterns per provider
const COURSE_CODE_PATTERNS: Record<string, RegExp> = {
  SOPHIA:         /^[A-Z]{2,10}\d{2,5}$/,           // e.g. CS1101, BUS1101
  STUDYCOM:       /^[A-Z]{2,10}\d{2,5}$/,           // e.g. CS101
  STRAIGHTERLINE: /^[A-Z]{2,10}\d{2,5}$/,           // e.g. ENG101
  CLEP:           /^[A-Z][A-Z\s\-]{2,40}$/,         // e.g. CALCULUS, COMPOSITION
  AP:             /^[A-Z][A-Z\s\-]{2,40}$/,         // e.g. AP CALCULUS
  DSST:           /^[A-Z][A-Z\s\-]{2,40}$/,         // e.g. ETHICS IN AMERICA
  SAYLOR:         /^[A-Z]{2,6}\d{2,4}$/,            // e.g. CS101
};

// Target institution course code patterns (university catalog codes)
const TARGET_CODE_PATTERN = /^[A-Z]{2,6}[\s\-]?\d{2,4}[A-Z]?$/; // e.g. COS-101, MAT-121, ENG101

// ---------------------------------------------------------------------------
// VALIDATION CHECKS
// ---------------------------------------------------------------------------

interface ValidationCheck {
  name: string;
  passed: boolean;
  score: number;      // 0-1 contribution
  weight: number;     // importance weight
  detail: string;
}

interface CandidateRow {
  id: string;
  source_institution: string;
  source_course_code: string;
  source_course_title: string | null;
  target_institution: string;
  target_course_code: string | null;
  target_course_title: string | null;
  acceptance_status: string;
  confidence_score: number;
  status: string;
}

function checkProviderKnown(src: string): ValidationCheck {
  const upper = src.toUpperCase();
  const passed = KNOWN_PROVIDERS.has(upper);
  return {
    name: 'provider_known',
    passed,
    score: passed ? 1.0 : 0.0,
    weight: 0.15,
    detail: passed ? `${upper} is a known provider` : `${upper} is NOT a recognized provider`,
  };
}

function checkSourceCodeFormat(src: string, code: string): ValidationCheck {
  const pattern = COURSE_CODE_PATTERNS[src.toUpperCase()];
  if (!pattern) {
    return { name: 'source_code_format', passed: false, score: 0.3, weight: 0.10,
      detail: `No format pattern defined for provider ${src}` };
  }
  const passed = pattern.test(code.toUpperCase().replace(/[\s\-]/g, ''));
  return {
    name: 'source_code_format',
    passed,
    score: passed ? 1.0 : 0.2,
    weight: 0.10,
    detail: passed ? `${code} matches expected format for ${src}` : `${code} doesn't match expected format for ${src}`,
  };
}

function checkTargetCodeFormat(code: string | null): ValidationCheck {
  if (!code) {
    // null target = elective, which is valid
    return { name: 'target_code_format', passed: true, score: 0.8, weight: 0.10,
      detail: 'No target code (elective mapping)' };
  }
  const passed = TARGET_CODE_PATTERN.test(code.toUpperCase().replace(/\s+/g, ''));
  return {
    name: 'target_code_format',
    passed,
    score: passed ? 1.0 : 0.3,
    weight: 0.10,
    detail: passed ? `${code} matches university course code format` : `${code} doesn't match expected format`,
  };
}

function checkTitlePresent(title: string | null): ValidationCheck {
  const passed = !!title && title.length > 3;
  return {
    name: 'title_present',
    passed,
    score: passed ? 1.0 : 0.4,
    weight: 0.05,
    detail: passed ? 'Source course title present' : 'Missing or too short source course title',
  };
}

function checkAcceptanceConsistency(status: string, targetCode: string | null): ValidationCheck {
  // If accepted, should have a target code. If elective, target code should be null.
  let passed = true;
  let detail = 'Acceptance status consistent with target mapping';

  if (status === 'accepted' && !targetCode) {
    passed = false;
    detail = 'Status is "accepted" but no target course code provided — should be "elective"?';
  }
  if (status === 'elective' && targetCode) {
    // This is a soft warning — elective with a code is unusual but possible
    passed = true;
    detail = 'Status is "elective" with a target code — unusual but possible';
  }

  return {
    name: 'acceptance_consistency',
    passed,
    score: passed ? 1.0 : 0.3,
    weight: 0.10,
    detail,
  };
}

async function checkCatalogMatch(
  supabase: any,
  targetInstitution: string,
  targetCode: string | null,
): Promise<ValidationCheck> {
  if (!targetCode) {
    return { name: 'catalog_match', passed: true, score: 0.7, weight: 0.25,
      detail: 'Elective mapping — no catalog check needed' };
  }

  // Check if the target course exists in edu_courses for this institution
  const codeNorm = targetCode.toUpperCase().replace(/[\s\-]/g, '');
  const { data, error } = await supabase
    .from('edu_courses')
    .select('id, code, title, institution_code')
    .or(`institution_code.eq.${targetInstitution},institution_code.is.null`)
    .limit(50);

  if (error) {
    console.warn('Catalog lookup error:', error.message);
    return { name: 'catalog_match', passed: false, score: 0.5, weight: 0.25,
      detail: `Catalog lookup failed: ${error.message}` };
  }

  // Try to match course code (flexible matching)
  const match = (data || []).find((c: any) => {
    const dbCode = (c.code || '').toUpperCase().replace(/[\s\-]/g, '');
    return dbCode === codeNorm;
  });

  if (match) {
    return { name: 'catalog_match', passed: true, score: 1.0, weight: 0.25,
      detail: `Matched catalog course: ${match.code} — ${match.title}` };
  }

  // Partial match: check if code starts with same prefix
  const prefix = codeNorm.replace(/\d+.*/, '');
  const partialMatch = (data || []).some((c: any) => {
    const dbPrefix = (c.code || '').toUpperCase().replace(/[\s\-]/g, '').replace(/\d+.*/, '');
    return dbPrefix === prefix;
  });

  if (partialMatch) {
    return { name: 'catalog_match', passed: false, score: 0.5, weight: 0.25,
      detail: `No exact match for ${targetCode}, but found courses with same department prefix` };
  }

  return { name: 'catalog_match', passed: false, score: 0.2, weight: 0.25,
    detail: `${targetCode} not found in catalog for ${targetInstitution}` };
}

async function checkExistingRuleConflict(
  supabase: any,
  src: string,
  srcCode: string,
  target: string,
): Promise<ValidationCheck> {
  // Check if there's already a rule with DIFFERENT target mapping
  const { data } = await supabase
    .from('credit_transfer_rules')
    .select('target_course_code, acceptance_status')
    .eq('source_institution', src.toUpperCase())
    .ilike('source_course_code', srcCode)
    .eq('target_institution', target.toUpperCase())
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { name: 'no_conflict', passed: true, score: 1.0, weight: 0.15,
      detail: 'No conflicting existing rule' };
  }

  return { name: 'no_conflict', passed: false, score: 0.0, weight: 0.15,
    detail: `Conflicts with existing rule: ${src} ${srcCode} → ${data.target_course_code || '(elective)'} [${data.acceptance_status}]` };
}

function checkConfidenceReasonable(aiConfidence: number): ValidationCheck {
  // AI self-confidence above 0.95 for anything is suspicious
  if (aiConfidence > 0.98) {
    return { name: 'confidence_calibration', passed: false, score: 0.6, weight: 0.10,
      detail: `AI confidence ${aiConfidence} is suspiciously high — may indicate overconfidence` };
  }
  if (aiConfidence < 0.30) {
    return { name: 'confidence_calibration', passed: false, score: 0.3, weight: 0.10,
      detail: `AI confidence ${aiConfidence} is very low — likely unreliable` };
  }
  return { name: 'confidence_calibration', passed: true, score: 1.0, weight: 0.10,
    detail: `AI confidence ${aiConfidence} is within reasonable range` };
}

// ---------------------------------------------------------------------------
// COMPUTE COMPOSITE VALIDATION SCORE
// ---------------------------------------------------------------------------

function computeValidationScore(checks: ValidationCheck[]): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of checks) {
    weightedSum += c.score * c.weight;
    totalWeight += c.weight;
  }
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 1000) / 1000 : 0;
}

// ---------------------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Auth
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      // OK
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { error } = await supabase.auth.getUser(token);
      if (error) throw new Error('Unauthorized');
    } else {
      throw new Error('Missing authentication');
    }

    const body = await req.json();
    const {
      batch_id,
      candidate_ids,
      auto_promote_threshold = 0.80,
      dry_run = false,
    } = body;

    // Fetch candidates to validate
    let query = supabase
      .from('transfer_rule_candidates')
      .select('id, source_institution, source_course_code, source_course_title, target_institution, target_course_code, target_course_title, acceptance_status, confidence_score, status')
      .eq('status', 'pending');

    if (batch_id) {
      query = query.eq('batch_id', batch_id);
    } else if (candidate_ids?.length) {
      query = query.in('id', candidate_ids);
    } else {
      // Sweep mode: grab unvalidated pending candidates
      query = query.is('validated_at', null).limit(100);
    }

    const { data: candidates, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!candidates || candidates.length === 0) {
      return jsonOk({ validated: 0, promoted: 0, flagged: 0, results: [] });
    }

    console.log(`🔍 Validating ${candidates.length} candidates...`);

    // Run validation on each candidate
    const results: Array<{
      id: string;
      source: string;
      target: string;
      validation_score: number;
      flags: string[];
      action: string;
    }> = [];

    let promotedCount = 0;
    let flaggedCount = 0;

    for (const c of candidates as CandidateRow[]) {
      // Run all checks
      const checks: ValidationCheck[] = [
        checkProviderKnown(c.source_institution),
        checkSourceCodeFormat(c.source_institution, c.source_course_code),
        checkTargetCodeFormat(c.target_course_code),
        checkTitlePresent(c.source_course_title),
        checkAcceptanceConsistency(c.acceptance_status, c.target_course_code),
        checkConfidenceReasonable(c.confidence_score),
        await checkCatalogMatch(supabase, c.target_institution, c.target_course_code),
        await checkExistingRuleConflict(supabase, c.source_institution, c.source_course_code, c.target_institution),
      ];

      const validationScore = computeValidationScore(checks);
      const flags = checks.filter(ch => !ch.passed).map(ch => ch.name);

      // Combined score: geometric mean of AI confidence and validation score
      // This prevents either score from single-handedly promoting a bad rule
      const combinedScore = Math.sqrt(c.confidence_score * validationScore);
      const shouldPromote = combinedScore >= auto_promote_threshold && flags.length === 0;

      // Update candidate with validation results
      const updateData: Record<string, unknown> = {
        validation_result: {
          checks: checks.map(ch => ({ name: ch.name, passed: ch.passed, score: ch.score, detail: ch.detail })),
          combined_score: combinedScore,
        },
        validation_score: validationScore,
        validated_at: new Date().toISOString(),
        validation_flags: flags,
      };

      let action = 'validated';

      if (!dry_run && shouldPromote) {
        // Promote to credit_transfer_rules
        const { error: promoteErr } = await supabase
          .from('credit_transfer_rules')
          .insert({
            source_institution: c.source_institution,
            source_course_code: c.source_course_code,
            target_institution: c.target_institution,
            target_course_code: c.target_course_code,
            acceptance_status: c.acceptance_status,
            rule_source: 'ai_validated',
            confidence: combinedScore,
            evidence_url: null, // inherited from candidate
          });

        if (!promoteErr) {
          updateData.status = 'promoted';
          action = 'promoted';
          promotedCount++;
        } else {
          console.warn(`Promotion failed for ${c.id}:`, promoteErr.message);
          updateData.promotion_error = promoteErr.message;
          action = 'promotion_failed';
        }
      } else if (flags.length > 0) {
        flaggedCount++;
        action = dry_run ? 'would_flag' : 'flagged';
      } else if (shouldPromote && dry_run) {
        action = 'would_promote';
      }

      await supabase
        .from('transfer_rule_candidates')
        .update(updateData)
        .eq('id', c.id);

      results.push({
        id: c.id,
        source: `${c.source_institution} ${c.source_course_code}`,
        target: c.target_course_code || '(elective)',
        validation_score: validationScore,
        flags,
        action,
      });
    }

    console.log(`✅ Validation complete: ${candidates.length} validated, ${promotedCount} promoted, ${flaggedCount} flagged`);

    return jsonOk({
      validated: candidates.length,
      promoted: promotedCount,
      flagged: flaggedCount,
      dry_run,
      auto_promote_threshold,
      results,
    });

  } catch (error) {
    console.error('validate-transfer-candidates error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
