import { supabase } from '@/integrations/supabase/client';
import { marketplaceKeysFromNodeId } from '@/hooks/useBatchRequirementOptions';

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

  // Marketplace presence
  const candidates = Array.from(reqIds).flatMap(marketplaceKeysFromNodeId);
  const unique = Array.from(new Set(candidates.map(k => String(k).toLowerCase())));
  const present = new Set<string>();
  for (let i = 0; i < unique.length; i += 500) {
    const part = unique.slice(i, i + 500);
    const { data, error } = await supabase
      .from('requirement_option_counts_by_block')
      .select('block_id')
      .in('block_id', part);
    if (error) {
      issues.push(`DB query error: ${error.message}`);
      continue;
    }
    data?.forEach(r => present.add(String(r.block_id).toLowerCase()));
  }
  for (const id of reqIds) {
    const hasMatch = marketplaceKeysFromNodeId(id).some(k => present.has(k.toLowerCase()));
    if (!hasMatch) stats.missingMarketplaceRows.push(id);
  }
  if (stats.missingMarketplaceRows.length) {
    issues.push(`No marketplace rows for: ${stats.missingMarketplaceRows.join(', ')}`);
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
}