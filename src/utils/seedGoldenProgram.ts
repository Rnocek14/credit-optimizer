import { supabase } from '@/integrations/supabase/client';
import { goldenBsCsRequirements, goldenBsCsBlocks, goldenBsCsOptions } from '@/data/seeds/goldenBsCs';

export async function seedGoldenBsCs() {
  console.log('[Seed] Starting golden BS CS seed...');
  
  const results = {
    requirements: { success: 0, error: 0 },
    blocks: { success: 0, error: 0 },
    options: { success: 0, error: 0 },
    errors: [] as string[],
  };

  // 1. Insert program requirements
  console.log('[Seed] Inserting program requirements...');
  const { data: reqData, error: reqError } = await supabase
    .from('program_requirements')
    .upsert(goldenBsCsRequirements, { onConflict: 'program_id,name' })
    .select();
  
  if (reqError) {
    results.errors.push(`Requirements error: ${reqError.message}`);
    results.requirements.error = goldenBsCsRequirements.length;
  } else {
    results.requirements.success = reqData?.length || 0;
    console.log(`[Seed] ✅ Inserted ${results.requirements.success} requirements`);
  }

  // 2. Insert requirement blocks
  console.log('[Seed] Inserting requirement blocks...');
  const { data: blockData, error: blockError } = await supabase
    .from('requirement_blocks')
    .upsert(goldenBsCsBlocks, { onConflict: 'slug' })
    .select();
  
  if (blockError) {
    results.errors.push(`Blocks error: ${blockError.message}`);
    results.blocks.error = goldenBsCsBlocks.length;
  } else {
    results.blocks.success = blockData?.length || 0;
    console.log(`[Seed] ✅ Inserted ${results.blocks.success} blocks`);
  }

  // 3. Skip requirement options for now (requires real marketplace course IDs)
  console.log('[Seed] Skipping requirement options (no marketplace data yet)');
  results.options.success = 0;

  // 4. Verification queries
  console.log('[Seed] Running verification...');
  
  const { data: creditsCheck } = await supabase
    .from('program_requirements')
    .select('credits_required')
    .eq('program_id', 'bs_cs');
  
  const totalCredits = creditsCheck?.reduce((sum, r) => sum + (r.credits_required || 0), 0) || 0;
  
  const { data: blocksCheck } = await supabase
    .from('requirement_blocks')
    .select('id')
    .eq('program_id', 'bs_cs');
  
  const blockCount = blocksCheck?.length || 0;

  console.log('[Seed] Verification results:', {
    totalCredits,
    blockCount,
    targetCredits: 120,
    targetBlocks: 6,
    passesGating: totalCredits >= 110 && blockCount >= 1,
  });

  return {
    ...results,
    verification: {
      totalCredits,
      blockCount,
      passesGating: totalCredits >= 110 && blockCount >= 1,
    },
  };
}
