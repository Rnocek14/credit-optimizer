import { supabase } from '@/integrations/supabase/client';
import { getAnchorPolicy } from '@/pages/EduTree/v5/data/anchorPolicies';

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

  // 3) All marketplace options (requirement_options + educational_courses joined)
  const { data: allOptions, error: optionsError } = await supabase
    .from('requirement_options')
    .select(`
      *,
      educational_courses (*)
    `);

  if (optionsError) {
    console.warn('[fetchCareerV5DataFor] requirement_options error, continuing with empty options:', optionsError);
  }

  console.log('[fetchCareerV5DataFor] Options fetched:', allOptions?.length || 0);

  // 4) Anchor policy from constants
  const anchorPolicy = getAnchorPolicy(anchorSchool);

  if (!anchorPolicy) {
    console.warn('[fetchCareerV5DataFor] No anchor policy found for:', anchorSchool);
  }

  const result = {
    modules: modules ?? [],
    blocks: blocks ?? [],
    allOptions: allOptions ?? [],
    anchorPolicy,
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
  });

  return result;
}
