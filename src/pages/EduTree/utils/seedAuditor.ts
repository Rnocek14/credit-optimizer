import { supabase } from '@/integrations/supabase/client';
import { marketplaceKeysFromNodeId } from '@/hooks/useBatchRequirementOptions';
import { IN_CHUNK } from '@/config/versions';
import { ENV } from '@/config/env';

type Block = {
  id: string;
  program_id?: string;
  level_year?: number;
  is_header?: boolean;
  is_empty_year?: boolean;
};

type Result = {
  passed: boolean;
  issues: string[];
  stats: {
    totalBlocks: number;
    requirementBlocks: number;
    gateBlocks: number;
    programCoverage: Record<string, number[]>;
    missingMarketplaceRows: string[];
  };
};

export async function auditSeeds(blocks: Block[], selectedPrograms: string[]): Promise<Result> {
  const issues: string[] = [];
  const stats: Result['stats'] = {
    totalBlocks: blocks.length,
    requirementBlocks: 0,
    gateBlocks: 0,
    programCoverage: {},
    missingMarketplaceRows: [],
  };

  const reqIds = new Set<string>();
  for (const b of blocks) {
    const id = String(b.id);
    if (id.startsWith('gate-')) { stats.gateBlocks++; continue; }
    if (b.is_header || b.is_empty_year) continue;

    stats.requirementBlocks++;

    if (!/^y\d-/.test(id)) issues.push(`Node not year-prefixed: ${id}`);
    if (reqIds.has(id)) issues.push(`Duplicate node ID: ${id}`);
    reqIds.add(id);

    const p = b.program_id ?? 'unknown';
    stats.programCoverage[p] ??= [];
    if (!stats.programCoverage[p].includes(b.level_year ?? -1)) {
      stats.programCoverage[p].push(b.level_year ?? -1);
    }
  }

  for (const p of selectedPrograms) {
    const years = stats.programCoverage[p] ?? [];
    [1, 2, 3, 4].forEach(y => { if (!years.includes(y)) issues.push(`Missing year ${y} blocks in ${p}`); });
  }

  // Gate membership validation
  const y1Ids = Array.from(reqIds).filter(id => /^y1-/.test(id));
  const y2Ids = Array.from(reqIds).filter(id => /^y2-/.test(id));
  
  if (y1Ids.length === 0) {
    issues.push('No Y1 requirements found to contribute to gate-y2-programs');
  }
  
  const programSpecificY2 = y2Ids.filter(id => {
    const block = blocks.find(b => String(b.id) === id);
    return block && selectedPrograms.includes(block.program_id || '');
  });
  
  if (selectedPrograms.length > 0 && programSpecificY2.length === 0) {
    issues.push('No program-specific Y2 requirements found to contribute to gate-y3-tracks');
  }

  // Marketplace presence (skip if AUDIT_MP=false via ENV)
  if (ENV.AUDIT_MP) {
    const candidates = Array.from(reqIds).flatMap(marketplaceKeysFromNodeId);
    const unique = Array.from(new Set(candidates.map(k => String(k).toLowerCase())));
    const present = new Set<string>();
    for (let i = 0; i < unique.length; i += IN_CHUNK) {
      const part = unique.slice(i, i + IN_CHUNK);
      try {
        const { data, error } = await supabase
          .from('requirement_option_counts_by_block')
          .select('block_id')
          .in('block_id', part);
        if (error) {
          issues.push(`DB query error: ${error.message}`);
          continue;
        }
        data?.forEach(r => present.add(String(r.block_id).toLowerCase()));
      } catch (e) {
        // Handle Supabase connection issues silently in dev
        console.warn('[SeedAudit] DB connection issue:', e);
      }
    }
    for (const id of reqIds) {
      const hasMatch = marketplaceKeysFromNodeId(id).some(k => present.has(k.toLowerCase()));
      if (!hasMatch) stats.missingMarketplaceRows.push(id);
    }
    if (stats.missingMarketplaceRows.length) {
      issues.push(`No marketplace rows for: ${stats.missingMarketplaceRows.join(', ')}`);
    }
  }

  return { passed: issues.length === 0, issues, stats };
}

export function printAuditReport(result: Result) {
  if (result.passed) {
    console.log('%c[SeedAudit] ✅ All checks passed', 'color:#0a0;font-weight:700');
    console.table(result.stats.programCoverage);
    return;
  }
  
  console.group('%c[SeedAudit] ❌ Issues', 'color:#c00;font-weight:700');
  console.log('Stats:', result.stats);
  result.issues.forEach(i => console.warn(' -', i));
  console.groupEnd();
  
  // Separate marketplace failures from structural issues
  const hasMarketplaceIssues = result.stats.missingMarketplaceRows.length > 0;
  const hasStructuralIssues = result.issues.some(i => !i.startsWith('No marketplace rows'));
  
  // CI mode: fail on structural issues (blocks, gates, year coverage)
  if (ENV.AUDIT_SEEDS && hasStructuralIssues) {
    console.error('[SeedAudit] 🚨 Failing CI due to seed structure issues');
    throw new Error(`Seed audit failed with ${result.issues.length} issue(s)`);
  }
  
  // Marketplace mode: fail specifically on missing course data
  if (ENV.AUDIT_MP && hasMarketplaceIssues) {
    console.error(
      `[SeedAudit] 🚨 Failing due to missing marketplace data for ${result.stats.missingMarketplaceRows.length} blocks\n` +
      `Missing: ${result.stats.missingMarketplaceRows.join(', ')}\n` +
      `Fix: Seed requirement_option_counts_by_block table or run: SELECT refresh_requirement_option_counts();`
    );
    throw new Error(
      `Marketplace audit failed: ${result.stats.missingMarketplaceRows.length} blocks have no course options`
    );
  }
}