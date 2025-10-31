import { supabase } from "@/integrations/supabase/client";

export async function fixMarketplaceData() {
  try {
    console.log('🔧 Fixing marketplace data...');
    
    // Insert providers
    const { error: providerError } = await supabase
      .from('providers')
      .upsert([
        { id: 'prov_sophia', name: 'Sophia Learning', type: 'mooc', accreditation: 'ACE Approved', country: 'US', website_url: 'https://sophia.org', active: true, provider_code: 'SOPHIA' },
        { id: 'prov_study', name: 'Study.com', type: 'mooc', accreditation: 'ACE Approved', country: 'US', website_url: 'https://study.com', active: true, provider_code: 'STUDY' },
        { id: 'prov_coursera', name: 'Coursera', type: 'mooc', country: 'US', website_url: 'https://coursera.org', active: true, provider_code: 'COURSERA' },
        { id: 'prov_clep', name: 'CLEP', type: 'testing_center', accreditation: 'College Board', country: 'US', website_url: 'https://clep.collegeboard.org', active: true, provider_code: 'CLEP' }
      ], { onConflict: 'id' });

    if (providerError) {
      console.error('Provider error:', providerError);
      throw providerError;
    }

    // Insert marketplace courses with matching edu_course IDs
    const { error: courseError } = await supabase
      .from('marketplace_courses')
      .upsert([
        {
          id: 'd25639ab-f98e-4a18-9a48-69acf6c29a27',
          code: 'CS-101',
          title: 'Programming Fundamentals I',
          description: 'Introduction to programming using Python',
          credits: 3,
          level: 100,
          modality: 'online',
          duration_weeks: 6,
          cost_usd: 89,
          skill_tags: ['python', 'programming'],
          provider_id: 'prov_sophia',
          active: true,
          cri_score: 75
        },
        {
          id: 'e2465426-e0cb-4678-920d-1861b8ca4ba4',
          code: 'CS-102',
          title: 'Programming Fundamentals II',
          description: 'Advanced programming with data structures',
          credits: 3,
          level: 100,
          modality: 'online',
          duration_weeks: 8,
          cost_usd: 199,
          skill_tags: ['python', 'data-structures'],
          provider_id: 'prov_coursera',
          active: true,
          cri_score: 82
        },
        {
          id: '6f238b4f-0090-424e-8a9c-948f7f50f4dc',
          code: 'MATH-110',
          title: 'College Algebra',
          description: 'Foundational algebra course',
          credits: 3,
          level: 100,
          modality: 'online',
          duration_weeks: 4,
          cost_usd: 59,
          skill_tags: ['algebra', 'mathematics'],
          provider_id: 'prov_sophia',
          active: true,
          cri_score: 70
        },
        {
          id: '76d4ed47-b3e5-4adf-8a7a-6ebbc5a5bcec',
          code: 'MATH-141',
          title: 'Calculus I',
          description: 'Single-variable calculus',
          credits: 4,
          level: 200,
          modality: 'online',
          duration_weeks: 12,
          cost_usd: 249,
          skill_tags: ['calculus', 'mathematics'],
          provider_id: 'prov_coursera',
          active: true,
          cri_score: 85
        },
        {
          id: 'cf623367-3650-45e5-916e-1f14b87abda7',
          code: 'MATH-111',
          title: 'College Algebra II',
          description: 'Advanced algebra topics',
          credits: 3,
          level: 200,
          modality: 'online',
          duration_weeks: 6,
          cost_usd: 89,
          skill_tags: ['algebra', 'mathematics'],
          provider_id: 'prov_study',
          active: true,
          cri_score: 72
        },
        {
          id: '3d8a8b85-a084-4fbb-8670-d8d11187a2a6',
          code: 'MATH-120',
          title: 'Statistics',
          description: 'Introduction to statistical methods',
          credits: 3,
          level: 200,
          modality: 'online',
          duration_weeks: 8,
          cost_usd: 249,
          skill_tags: ['statistics', 'data-analysis'],
          provider_id: 'prov_coursera',
          active: true,
          cri_score: 80
        }
      ], { onConflict: 'id' });

    if (courseError) {
      console.error('Course error:', courseError);
      throw courseError;
    }

    console.log('✅ Marketplace data fixed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to fix marketplace data:', error);
    throw error;
  }
}

// Auto-run on mount
if (typeof window !== 'undefined') {
  const FIX_KEY = 'marketplace_fixed_v1';
  if (!sessionStorage.getItem(FIX_KEY)) {
    console.log('🔧 Initiating marketplace fix...');
    fixMarketplaceData()
      .then(() => {
        sessionStorage.setItem(FIX_KEY, 'true');
        console.log('✅ Marketplace fix complete - refresh to see data');
        // Force reload after fix
        setTimeout(() => window.location.reload(), 1000);
      })
      .catch((error) => {
        console.error('❌ Marketplace fix failed:', error?.message ?? error);
      });
  }
}
