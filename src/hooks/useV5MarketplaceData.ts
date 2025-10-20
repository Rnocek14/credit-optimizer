import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModuleData } from '@/pages/EduTree/v5/types/v5';

function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    gened: '📚',
    core: '💻',
    elective: '🎯',
    capstone: '🎓',
    lab: '🔬',
    math: '🔢',
  };
  return iconMap[category.toLowerCase()] || '📖';
}

function transformToModuleData(requirements: any[]): ModuleData[] {
  return requirements.map(req => {
    const options = req.requirement_options || [];
    const marketplaceCourses = options
      .map((opt: any) => opt.marketplace_courses)
      .filter((c: any) => c !== null && c !== undefined && typeof c === 'object' && !c.error);
    
    const hasAceCredit = req.equivalence_group_members?.some(
      (egm: any) => egm.source === 'ACE'
    ) || false;
    
    const hasClep = req.equivalence_group_members?.some(
      (egm: any) => egm.source === 'CLEP'
    ) || false;
    
    const costs = marketplaceCourses.map((c: any) => c?.cost_usd).filter((c: any) => c !== null && c !== undefined);
    const cheapestOption = costs.length > 0 ? Math.min(...costs) : null;

    // Map marketplace courses to Course[] format for display
    const coursesForDisplay = marketplaceCourses.slice(0, 3).map((c: any) => ({
      courseId: c?.id || '',
      title: c?.title || 'Untitled Course',
      credits: c?.credits || 0,
      subject: c?.providers?.name || 'General',
    }));

    return {
      id: `module-${req.id}`,
      requirementId: req.id,
      label: req.name,
      description: req.description || '',
      icon: getCategoryIcon(req.category),
      courses: coursesForDisplay,
      creditsEarned: 0,
      creditsRequired: req.credits_required,
      isCollapsed: true,
      minSelect: req.min_select || undefined,
      marketplaceOptions: marketplaceCourses.map((c: any) => ({
        id: c?.id || '',
        title: c?.title || 'Untitled',
        provider: c?.providers?.name || null,
        providerId: c?.provider_id || '',
        credits: c?.credits || 0,
        cost_usd: c?.cost_usd ?? null,
        cri_score: c?.cri_score ?? null,
        duration_weeks: c?.duration_weeks ?? null,
      })),
      optionsCount: marketplaceCourses.length,
      cheapestOption,
      hasAceCredit,
      hasClep,
    };
  });
}

export function useV5MarketplaceData(programId: string) {
  return useQuery({
    queryKey: ['v5-marketplace', programId],
    queryFn: async () => {
      console.log('[useV5MarketplaceData] Fetching requirements for program:', programId);
      
      const { data, error } = await supabase
        .from('program_requirements')
        .select(`
          *,
          requirement_options (
            id,
            requirement_id,
            course_id,
            marketplace_courses (
              id,
              title,
              credits,
              cost_usd,
              duration_weeks,
              cri_score,
              provider_id,
              providers (
                name
              )
            )
          ),
          equivalence_group_members (
            source
          )
        `)
        .eq('program_id', programId)
        .order('year', { ascending: true });

      if (error) {
        console.error('[useV5MarketplaceData] Query error:', error);
        throw error;
      }

      console.log('[useV5MarketplaceData] Fetched:', data?.length, 'requirements');
      
      const transformed = transformToModuleData(data || []);
      console.log('[useV5MarketplaceData] Transformed modules:', transformed.map(m => ({
        label: m.label,
        courses: m.courses.length,
        marketplaceOptions: m.marketplaceOptions?.length || 0
      })));
      
      return transformed;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
