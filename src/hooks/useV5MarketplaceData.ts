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

function transformToModuleData(
  requirements: any[],
  options: any[],
  courses: any[],
  equivalences: any[]
): ModuleData[] {
  // Create lookup maps for efficient joining
  const courseMap = new Map(courses.map(c => [c.id, c]));
  const equivalenceMap = new Map(equivalences.map(e => [e.course_id, e]));
  
  return requirements.map(req => {
    // Get options for this requirement
    const reqOptions = options.filter(opt => opt.requirement_id === req.id);
    
    // Get marketplace courses for these options
    const marketplaceCourses = reqOptions
      .filter(opt => opt.option_kind === 'course')
      .map(opt => courseMap.get(opt.option_ref_id))
      .filter(Boolean);
    
    // Check ACE/CLEP from equivalences
    const hasAceCredit = marketplaceCourses.some(c => 
      equivalenceMap.get(c.id)?.source === 'ACE'
    );
    const hasClep = marketplaceCourses.some(c => 
      equivalenceMap.get(c.id)?.source === 'CLEP'
    );
    
    const costs = marketplaceCourses
      .map(c => c.cost_usd)
      .filter(cost => cost !== null && cost !== undefined);
    const cheapestOption = costs.length > 0 ? Math.min(...costs) : null;

    // Map marketplace courses to Course[] format for display
    const coursesForDisplay = marketplaceCourses.slice(0, 3).map((c: any) => ({
      courseId: c.id,
      title: c.title || 'Untitled Course',
      credits: c.credits || 0,
      subject: c.providers?.name || 'General',
    }));

    return {
      id: `module-${req.id}`,
      requirementId: req.id,
      year: req.year,
      label: req.name,
      description: req.description || '',
      icon: getCategoryIcon(req.category),
      courses: [],
      creditsEarned: 0,
      creditsRequired: req.credits_required,
      isCollapsed: true,
      minSelect: req.min_select || undefined,
      marketplaceOptions: marketplaceCourses.map((c: any) => ({
        id: c.id,
        title: c.title || 'Untitled',
        provider: c.providers?.name || null,
        providerId: c.provider_id || '',
        credits: c.credits || 0,
        cost_usd: c.cost_usd ?? null,
        cri_score: c.cri_score ?? null,
        duration_weeks: c.duration_weeks ?? null,
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
      
      // Step 1: Get all program requirements
      const { data: requirements, error: reqError } = await supabase
        .from('program_requirements')
        .select(`
          id,
          program_id,
          year,
          category,
          name,
          description,
          credits_required,
          min_select
        `)
        .eq('program_id', programId)
        .order('year', { ascending: true });

      if (reqError) {
        console.error('[useV5MarketplaceData] Requirements error:', reqError);
        throw reqError;
      }

      const requirementIds = requirements?.map(r => r.id) || [];
      console.log('[useV5MarketplaceData] Fetched:', requirements?.length, 'requirements');

      // Step 2: Get all requirement options
      const { data: options, error: optError } = await supabase
        .from('requirement_options')
        .select('id, requirement_id, option_kind, option_ref_id, credits_awarded')
        .in('requirement_id', requirementIds);

      if (optError) {
        console.error('[useV5MarketplaceData] Options error:', optError);
        throw optError;
      }

      console.log('[useV5MarketplaceData] Fetched:', options?.length, 'options');

      // Step 3: Get marketplace courses (with fallback to edu_courses)
      const courseIds = options
        ?.filter(opt => opt.option_kind === 'course')
        .map(opt => opt.option_ref_id) || [];

      const { data: marketplaceCourses, error: courseError } = await supabase
        .from('marketplace_courses')
        .select(`
          id,
          code,
          title,
          credits,
          cost_usd,
          duration_weeks,
          level,
          cri_score,
          provider_id,
          providers (
            name,
            type
          )
        `)
        .in('id', courseIds);

      if (courseError) {
        console.error('[useV5MarketplaceData] Marketplace courses error:', courseError);
      }

      console.log('[useV5MarketplaceData] Fetched:', marketplaceCourses?.length, 'marketplace courses');

      // Fallback to edu_courses if marketplace is empty
      const { data: eduCourses, error: eduError } = await supabase
        .from('edu_courses')
        .select('id, code, title, credits, level_year')
        .in('id', courseIds);

      if (eduError) {
        console.error('[useV5MarketplaceData] Edu courses error:', eduError);
      }

      console.log('[useV5MarketplaceData] Fetched:', eduCourses?.length, 'edu courses');

      // Merge both sources
      const courses = [
        ...(marketplaceCourses || []),
        ...(eduCourses || []).map(ec => ({
          id: ec.id,
          code: ec.code,
          title: ec.title,
          credits: ec.credits,
          level: `Year ${ec.level_year}`,
          cost_usd: null,
          duration_weeks: null,
          cri_score: null,
          provider_id: null,
          providers: null
        }))
      ];

      console.log('[useV5MarketplaceData] Total merged courses:', courses.length);

      // Step 4: Get equivalence data
      const { data: equivalences, error: eqError } = await supabase
        .from('equivalence_group_members')
        .select('course_id, source, confidence')
        .in('course_id', courseIds);

      if (eqError) {
        console.error('[useV5MarketplaceData] Equivalences error:', eqError);
        throw eqError;
      }

      console.log('[useV5MarketplaceData] Fetched:', equivalences?.length, 'equivalences');
      
      // Transform with manual joins
      const transformed = transformToModuleData(
        requirements || [],
        options || [],
        courses || [],
        equivalences || []
      );
      
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
