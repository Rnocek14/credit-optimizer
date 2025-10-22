import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceOptionLite {
  id: string;
  code: string;
  title: string;
  credits: number;
  cost_usd?: number | null;
  duration_weeks?: number | null;
  cri_score?: number | null;
  providerCode?: string | null;
  providerType?: string | null;
  level?: number | null;
}

export async function findTransferableAlternatives(opts: {
  requirementId?: string;
  targetSchool: string;
}): Promise<MarketplaceOptionLite[]> {
  // Query credit_transfer_rules for accepted courses
  const { data: rules } = await supabase
    .from('credit_transfer_rules' as any)
    .select('source_institution, source_course_code')
    .eq('target_institution', opts.targetSchool.toUpperCase())
    .eq('acceptance_status', 'accepted');

  if (!rules?.length) return [];

  const codes = rules.map((r: any) => r.source_course_code).filter(Boolean);
  if (!codes.length) return [];

  // Fetch matching marketplace courses with provider info
  const { data: courses } = await supabase
    .from('marketplace_courses')
    .select(`
      id, code, title, credits, level, cost_usd, duration_weeks, cri_score,
      providers:provider_id ( provider_code, type )
    `);

  if (!courses?.length) return [];

  // Filter to only courses that match the accepted transfer rules
  const matchingCourses = (courses as any[]).filter((c: any) => 
    codes.includes(c.code)
  );

  const list = matchingCourses.map((c: any) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    credits: c.credits,
    cost_usd: c.cost_usd,
    duration_weeks: c.duration_weeks,
    cri_score: c.cri_score ?? 0,
    providerCode: c.providers?.provider_code,
    providerType: c.providers?.type,
    level: c.level ?? 100,
  })) as MarketplaceOptionLite[];

  // Rank: high CRI → low cost → low duration
  return list.sort((a, b) =>
    (b.cri_score ?? 0) - (a.cri_score ?? 0) ||
    (a.cost_usd ?? 9e9) - (b.cost_usd ?? 9e9) ||
    (a.duration_weeks ?? 9e9) - (b.duration_weeks ?? 9e9)
  ).slice(0, 5);
}
