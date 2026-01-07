import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SeedProgress {
  phase: 'idle' | 'providers' | 'courses' | 'options' | 'complete' | 'error';
  providersInserted: number;
  providersSkipped: number;
  coursesInserted: number;
  coursesSkipped: number;
  optionsInserted: number;
  optionsSkipped: number;
  error?: string;
}

const PROVIDERS_DATA = [
  { provider_code: 'TESU', name: 'Thomas Edison State University', type: 'university' as const, active: true },
  { provider_code: 'WGU', name: 'Western Governors University', type: 'university' as const, active: true },
  { provider_code: 'EXCU', name: 'Excelsior University', type: 'university' as const, active: true },
  { provider_code: 'UMPI', name: 'University of Maine at Presque Isle', type: 'university' as const, active: true },
  { provider_code: 'SNHU', name: 'Southern New Hampshire University', type: 'university' as const, active: true },
  { provider_code: 'SOPHIA', name: 'Sophia Learning', type: 'mooc' as const, active: true },
  { provider_code: 'STUDY', name: 'Study.com', type: 'mooc' as const, active: true },
  { provider_code: 'STRAIGHTERLINE', name: 'StraighterLine', type: 'mooc' as const, active: true },
  { provider_code: 'COURSERA', name: 'Coursera', type: 'mooc' as const, active: true },
  { provider_code: 'EDX', name: 'edX', type: 'mooc' as const, active: true },
  { provider_code: 'CLEP', name: 'College Level Examination Program', type: 'testing_center' as const, active: true },
];

// Course data with provider_code instead of provider_id (we'll map later)
const COURSES_DATA = [
  // SOPHIA courses
  { provider_code: 'SOPHIA', code: 'SOPH-ENG101', title: 'English Composition I', credits: 3, modality: 'online' as const, cost_usd: 99, duration_weeks: 8, level: 100, active: true },
  { provider_code: 'SOPHIA', code: 'SOPH-MAT101', title: 'College Algebra', credits: 3, modality: 'online' as const, cost_usd: 99, duration_weeks: 8, level: 100, active: true },
  { provider_code: 'SOPHIA', code: 'SOPH-STA201', title: 'Introduction to Statistics', credits: 3, modality: 'online' as const, cost_usd: 99, duration_weeks: 8, level: 200, active: true },
  { provider_code: 'SOPHIA', code: 'SOPH-CS101', title: 'Introduction to Python', credits: 3, modality: 'online' as const, cost_usd: 99, duration_weeks: 8, level: 100, active: true },
  
  // Study.com courses
  { provider_code: 'STUDY', code: 'STDY-MAT101', title: 'College Algebra', credits: 3, modality: 'online' as const, cost_usd: 199, duration_weeks: 6, level: 100, active: true },
  { provider_code: 'STUDY', code: 'STDY-ENG101', title: 'English Composition', credits: 3, modality: 'online' as const, cost_usd: 199, duration_weeks: 6, level: 100, active: true },
  { provider_code: 'STUDY', code: 'STDY-CS101', title: 'Intro to Computer Science', credits: 3, modality: 'online' as const, cost_usd: 199, duration_weeks: 6, level: 100, active: true },
  { provider_code: 'STUDY', code: 'STDY-CS102', title: 'Introduction to Programming', credits: 3, modality: 'online' as const, cost_usd: 199, duration_weeks: 6, level: 100, active: true },
  { provider_code: 'STUDY', code: 'STDY-CS201', title: 'Data Structures', credits: 3, modality: 'online' as const, cost_usd: 199, duration_weeks: 8, level: 200, active: true },
  { provider_code: 'STUDY', code: 'STDY-CS301', title: 'Algorithms', credits: 3, modality: 'online' as const, cost_usd: 199, duration_weeks: 8, level: 300, active: true },
  
  // CLEP exams
  { provider_code: 'CLEP', code: 'CLEP-ALG', title: 'College Algebra CLEP', credits: 3, modality: 'in_person' as const, cost_usd: 90, duration_weeks: 1, level: 100, active: true },
  { provider_code: 'CLEP', code: 'CLEP-COMP', title: 'College Composition CLEP', credits: 6, modality: 'in_person' as const, cost_usd: 90, duration_weeks: 1, level: 100, active: true },
  
  // TESU courses
  { provider_code: 'TESU', code: 'TESU-ENG101', title: 'English Composition I', credits: 3, modality: 'online' as const, cost_usd: 516, duration_weeks: 12, level: 100, active: true },
  { provider_code: 'TESU', code: 'TESU-MAT121', title: 'College Algebra', credits: 3, modality: 'online' as const, cost_usd: 516, duration_weeks: 12, level: 100, active: true },
  { provider_code: 'TESU', code: 'TESU-COS101', title: 'Introduction to Computers', credits: 3, modality: 'online' as const, cost_usd: 516, duration_weeks: 12, level: 100, active: true },
  { provider_code: 'TESU', code: 'TESU-COS111', title: 'Introduction to Programming', credits: 3, modality: 'online' as const, cost_usd: 516, duration_weeks: 12, level: 100, active: true },
  
  // WGU courses
  { provider_code: 'WGU', code: 'WGU-C182', title: 'Introduction to IT', credits: 4, modality: 'online' as const, cost_usd: 0, duration_weeks: 6, level: 100, active: true },
  { provider_code: 'WGU', code: 'WGU-C779', title: 'Web Development Foundations', credits: 3, modality: 'online' as const, cost_usd: 0, duration_weeks: 6, level: 100, active: true },
  
  // EXCU courses
  { provider_code: 'EXCU', code: 'EXCU-ENG101', title: 'English Composition', credits: 3, modality: 'online' as const, cost_usd: 495, duration_weeks: 8, level: 100, active: true },
  { provider_code: 'EXCU', code: 'EXCU-MAT101', title: 'College Mathematics', credits: 3, modality: 'online' as const, cost_usd: 495, duration_weeks: 8, level: 100, active: true },
  { provider_code: 'EXCU', code: 'EXCU-CS101', title: 'Introduction to Programming', credits: 3, modality: 'online' as const, cost_usd: 495, duration_weeks: 8, level: 100, active: true },
  
  // Coursera
  { provider_code: 'COURSERA', code: 'COUR-CS101', title: 'Python for Everybody', credits: 3, modality: 'online' as const, cost_usd: 49, duration_weeks: 8, level: 100, active: true },
  
  // edX
  { provider_code: 'EDX', code: 'EDX-CS50', title: 'CS50: Introduction to Computer Science', credits: 3, modality: 'online' as const, cost_usd: 149, duration_weeks: 12, level: 100, active: true },
];

export function useMarketplaceSeeder() {
  const [progress, setProgress] = useState<SeedProgress>({
    phase: 'idle',
    providersInserted: 0,
    providersSkipped: 0,
    coursesInserted: 0,
    coursesSkipped: 0,
    optionsInserted: 0,
    optionsSkipped: 0,
  });
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Clear all marketplace data for a fresh reseed
  const clearMarketplaceData = useCallback(async () => {
    setIsClearing(true);
    try {
      console.log('Clearing marketplace data...');
      
      // Delete in order: options → courses → providers (due to FK constraints)
      const { error: optionsError } = await supabase
        .from('requirement_options')
        .delete()
        .eq('option_kind', 'course'); // Delete all course options
      
      if (optionsError) console.warn('Options clear warning:', optionsError.message);
      
      const { error: coursesError } = await supabase
        .from('marketplace_courses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (coursesError) throw new Error(`Courses clear error: ${coursesError.message}`);
      
      const { error: providersError } = await supabase
        .from('providers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (providersError) throw new Error(`Providers clear error: ${providersError.message}`);
      
      console.log('Marketplace data cleared successfully');
      
      // Reset progress
      setProgress({
        phase: 'idle',
        providersInserted: 0,
        providersSkipped: 0,
        coursesInserted: 0,
        coursesSkipped: 0,
        optionsInserted: 0,
        optionsSkipped: 0,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Clear marketplace error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsClearing(false);
    }
  }, []);

  const seedMarketplace = useCallback(async () => {
    setIsSeeding(true);
    setProgress({
      phase: 'providers',
      providersInserted: 0,
      providersSkipped: 0,
      coursesInserted: 0,
      coursesSkipped: 0,
      optionsInserted: 0,
      optionsSkipped: 0,
    });

    try {
      // Phase 1: Seed Providers
      console.log('Phase 1: Seeding providers...');
      const existingProviders = await supabase
        .from('providers')
        .select('provider_code')
        .in('provider_code', PROVIDERS_DATA.map(p => p.provider_code));
      
      const existingCodes = new Set(existingProviders.data?.map(p => p.provider_code) || []);
      const newProviders = PROVIDERS_DATA.filter(p => !existingCodes.has(p.provider_code));
      
      if (newProviders.length > 0) {
        const { error: providerError } = await supabase
          .from('providers')
          .insert(newProviders);
        
        if (providerError) throw new Error(`Provider insert error: ${providerError.message}`);
      }
      
      setProgress(p => ({
        ...p,
        providersInserted: newProviders.length,
        providersSkipped: PROVIDERS_DATA.length - newProviders.length,
        phase: 'courses',
      }));

      // Phase 2: Seed Courses
      console.log('Phase 2: Seeding marketplace courses...');
      
      // Get provider ID map
      const { data: providers } = await supabase
        .from('providers')
        .select('id, provider_code');
      
      const providerMap = new Map(providers?.map(p => [p.provider_code, p.id]) || []);
      
      // Map courses to have provider_id
      const coursesWithProviderIds = COURSES_DATA.map(c => ({
        provider_id: providerMap.get(c.provider_code),
        code: c.code,
        title: c.title,
        credits: c.credits,
        modality: c.modality,
        cost_usd: c.cost_usd,
        duration_weeks: c.duration_weeks,
        level: c.level,
        active: c.active,
      })).filter(c => c.provider_id); // Only courses with valid provider_id
      
      // Check existing courses by BOTH unique constraints (code AND provider_id+title)
      const { data: existingCourses } = await supabase
        .from('marketplace_courses')
        .select('code, provider_id, title');

      // Create sets for both constraint checks
      const existingCourseCodes = new Set(existingCourses?.map(c => c.code) || []);
      const existingProviderTitles = new Set(
        existingCourses?.map(c => `${c.provider_id}::${c.title}`) || []
      );

      // Filter out courses that violate EITHER constraint
      const coursesToInsert = coursesWithProviderIds.filter(c => {
        const codeExists = existingCourseCodes.has(c.code);
        const providerTitleExists = existingProviderTitles.has(`${c.provider_id}::${c.title}`);
        
        if (codeExists || providerTitleExists) {
          console.log(`Skipping course: ${c.code} (code exists: ${codeExists}, provider+title exists: ${providerTitleExists})`);
          return false;
        }
        return true;
      });

      const skippedCount = coursesWithProviderIds.length - coursesToInsert.length;

      if (coursesToInsert.length > 0) {
        const { error: courseError } = await supabase
          .from('marketplace_courses')
          .insert(coursesToInsert);
        
        if (courseError) throw new Error(`Course insert error: ${courseError.message}`);
      }

      setProgress(p => ({
        ...p,
        coursesInserted: coursesToInsert.length,
        coursesSkipped: skippedCount,
        phase: 'options',
      }));

      // Phase 3: Link Requirement Options
      console.log('Phase 3: Linking requirement options...');
      
      // Get all courses we just seeded
      const { data: allCourses } = await supabase
        .from('marketplace_courses')
        .select('id, code, title');
      
      // Get existing requirements
      const { data: requirements } = await supabase
        .from('program_requirements')
        .select('id, name, category');
      
      if (!requirements || requirements.length === 0) {
        console.log('No requirements found, skipping options linking');
        setProgress(p => ({ ...p, phase: 'complete' }));
        setIsSeeding(false);
        return progress;
      }
      
      // Create requirement options based on matching
      const optionsToInsert: Array<{
        requirement_id: string;
        option_kind: 'course';
        option_ref_id: string;
        transfer_eligible: boolean;
      }> = [];
      
      for (const req of requirements) {
        const matchingCourses = allCourses?.filter(c => {
          const titleLower = c.title.toLowerCase();
          const reqNameLower = req.name.toLowerCase();
          
          // Match math courses
          if (reqNameLower.includes('algebra') && titleLower.includes('algebra')) return true;
          if (reqNameLower.includes('math') && (titleLower.includes('math') || titleLower.includes('algebra'))) return true;
          if (reqNameLower.includes('statistics') && titleLower.includes('statistics')) return true;
          
          // Match English courses
          if (reqNameLower.includes('english') && titleLower.includes('english')) return true;
          if (reqNameLower.includes('composition') && titleLower.includes('composition')) return true;
          
          // Match CS courses
          if (reqNameLower.includes('programming') && titleLower.includes('programming')) return true;
          if (reqNameLower.includes('computer') && (titleLower.includes('computer') || titleLower.includes('cs'))) return true;
          if (reqNameLower.includes('data structures') && titleLower.includes('data structures')) return true;
          if (reqNameLower.includes('algorithms') && titleLower.includes('algorithm')) return true;
          
          return false;
        }) || [];
        
        for (const course of matchingCourses) {
          optionsToInsert.push({
            requirement_id: req.id,
            option_kind: 'course',
            option_ref_id: course.id,
            transfer_eligible: true,
          });
        }
      }
      
      // Check existing options
      const existingOptions = await supabase
        .from('requirement_options')
        .select('requirement_id, option_ref_id');
      
      const existingOptionKeys = new Set(
        existingOptions.data?.map(o => `${o.requirement_id}-${o.option_ref_id}`) || []
      );
      
      const newOptions = optionsToInsert.filter(
        o => !existingOptionKeys.has(`${o.requirement_id}-${o.option_ref_id}`)
      );
      
      if (newOptions.length > 0) {
        const { error: optionError } = await supabase
          .from('requirement_options')
          .insert(newOptions);
        
        if (optionError) throw new Error(`Option insert error: ${optionError.message}`);
      }
      
      setProgress(p => ({
        ...p,
        optionsInserted: newOptions.length,
        optionsSkipped: optionsToInsert.length - newOptions.length,
        phase: 'complete',
      }));
      
      console.log('Marketplace seeding complete!');
      
    } catch (error) {
      console.error('Marketplace seeding error:', error);
      setProgress(p => ({
        ...p,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setIsSeeding(false);
    }
    
    return progress;
  }, []);

  // Clear and reseed in one action
  const clearAndReseed = useCallback(async () => {
    const clearResult = await clearMarketplaceData();
    if (!clearResult.success) {
      setProgress(p => ({ ...p, phase: 'error', error: clearResult.error }));
      return;
    }
    await seedMarketplace();
  }, [clearMarketplaceData, seedMarketplace]);

  return {
    seedMarketplace,
    clearMarketplaceData,
    clearAndReseed,
    progress,
    isSeeding,
    isClearing,
  };
}
