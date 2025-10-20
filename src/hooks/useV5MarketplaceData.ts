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
    const courses = options
      .map((opt: any) => opt.marketplace_courses)
      .filter((c: any) => c !== null && c !== undefined && typeof c === 'object' && !c.error);
    
    const hasAceCredit = req.equivalence_group_members?.some(
      (egm: any) => egm.source === 'ACE'
    ) || false;
    
    const hasClep = req.equivalence_group_members?.some(
      (egm: any) => egm.source === 'CLEP'
    ) || false;
    
    const costs = courses.map((c: any) => c.cost_usd).filter((c: any) => c !== null && c !== undefined);
    const cheapestOption = costs.length > 0 ? Math.min(...costs) : null;

    return {
      id: `module-${req.id}`,
      requirementId: req.id,
      label: req.name,
      description: req.description || '',
      icon: getCategoryIcon(req.category),
      courses: [],
      creditsEarned: 0,
      creditsRequired: req.credits_required,
      isCollapsed: true,
      minSelect: req.min_select || undefined,
      marketplaceOptions: courses.map((c: any) => ({
        id: c.id,
        title: c.title,
        provider: c.providers?.name || null,
        providerId: c.provider_id,
        credits: c.credits,
        cost_usd: c.cost_usd,
        cri_score: c.cri_score,
        duration_weeks: c.duration_weeks,
      })),
      optionsCount: courses.length,
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
      // Simplified query - just get program requirements first
      const { data, error } = await supabase
        .from('program_requirements')
        .select('*')
        .eq('program_id', programId)
        .order('year', { ascending: true });

      if (error) throw error;

      // For now, return basic module data without marketplace options
      // This can be enhanced later when the schema relations are properly set up
      return (data || []).map(req => ({
        id: `module-${req.id}`,
        requirementId: req.id,
        label: req.name,
        description: req.description || '',
        icon: getCategoryIcon(req.category),
        courses: [],
        creditsEarned: 0,
        creditsRequired: req.credits_required,
        isCollapsed: true,
        minSelect: req.min_select || undefined,
        marketplaceOptions: [],
        optionsCount: 0,
        cheapestOption: null,
        hasAceCredit: false,
        hasClep: false,
      })) as ModuleData[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}
