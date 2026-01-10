import { supabase } from '@/integrations/supabase/client';
import { fetchPolicyPackOrStatic } from '@/lib/degree/useInstitutionPolicyPack';

/**
 * Non-hook helper to fetch V5 data for a specific program + anchor school
 * Same logic as useCareerV5Data, but can be called from within queryFn
 * 
 * This is the single source of truth for fetching career exploration data
 */
export async function fetchCareerV5DataFor(programId: string, anchorSchool: string) {
  console.log('[fetchCareerV5DataFor] Fetching data for:', { programId, anchorSchool });

  // 1) Program requirements (these become "modules" in the engine)
  const { data: modules, error: modulesError } = await supabase
    .from('program_requirements')
    .select('*')
    .eq('program_id', programId);

  if (modulesError) {
    console.error('[fetchCareerV5DataFor] program_requirements error:', modulesError);
    throw modulesError;
  }

  console.log('[fetchCareerV5DataFor] Modules fetched:', modules?.length || 0);

  // 2) Requirement blocks (for GE/Core/Elective gating)
  const { data: blocks, error: blocksError } = await supabase
    .from('requirement_blocks')
    .select('*');

  if (blocksError) {
    console.warn('[fetchCareerV5DataFor] requirement_blocks error, continuing with empty blocks:', blocksError);
  }

  console.log('[fetchCareerV5DataFor] Blocks fetched:', blocks?.length || 0);

  // 3) All marketplace options with course details
  // Note: Fetch options, then enrich with courses from edu_courses + marketplace_courses
  const { data: rawOptions, error: optionsError } = await supabase
    .from('requirement_options')
    .select('id, requirement_id, option_kind, option_ref_id, credits_awarded');

  // 3.5) Enrich options with actual course data from correct tables
  const optionRefIds = rawOptions?.map(o => o.option_ref_id).filter(Boolean) ?? [];
  
  const { data: eduCourses } = await supabase
    .from('edu_courses')
    .select('id, code, title, credits')
    .in('id', optionRefIds.length > 0 ? optionRefIds : ['']);

  const { data: marketplaceCourses } = await supabase
    .from('marketplace_courses')
    .select('id, code, title, credits, cost_usd, duration_weeks, provider_id')
    .in('id', optionRefIds.length > 0 ? optionRefIds : ['']);

  // Merge course data into options
  const allOptions = (rawOptions ?? []).map(opt => {
    const eduCourse = eduCourses?.find(c => c.id === opt.option_ref_id);
    const mkCourse = marketplaceCourses?.find(c => c.id === opt.option_ref_id);
    return {
      ...opt,
      edu_courses: eduCourse ?? null,
      marketplace_courses: mkCourse ?? null,
    };
  });

  if (optionsError) {
    console.warn('[fetchCareerV5DataFor] requirement_options error, continuing with empty options:', optionsError);
  }

  console.log('[fetchCareerV5DataFor] Options fetched:', allOptions?.length || 0);

  // 4) Anchor policy - try scraped DB pack first, fallback to static
  const policyResult = await fetchPolicyPackOrStatic(anchorSchool);
  const anchorPolicy = policyResult.policy;

  if (!anchorPolicy) {
    console.warn('[fetchCareerV5DataFor] No anchor policy found for:', anchorSchool);
  } else {
    console.log('[fetchCareerV5DataFor] Policy loaded:', anchorSchool, {
      source: policyResult.source,
      residency: anchorPolicy.min_residency_credits,
      maxAlt: anchorPolicy.max_alt_credits,
    });
  }

  const result = {
    modules: modules ?? [],
    blocks: blocks ?? [],
    allOptions: allOptions ?? [],
    anchorPolicy,
    policySource: policyResult.source,
    constraints: {
      target_school: anchorSchool,
      target_program_id: programId,
    },
    basket: [], // Empty basket for fresh career exploration
    years: 4,
  };

  console.log('[fetchCareerV5DataFor] Final context:', {
    modulesCount: result.modules.length,
    blocksCount: result.blocks.length,
    optionsCount: result.allOptions.length,
    hasAnchorPolicy: !!result.anchorPolicy,
    policySource: result.policySource,
  });

  return result;
}
