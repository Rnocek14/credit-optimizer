import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database, Loader2 } from 'lucide-react';
import type { ProviderType, ModalityType } from '@/types/marketplace';

export function QuickMarketplaceSeed() {
  const [isSeeding, setIsSeeding] = useState(false);

  const seedMarketplace = async () => {
    setIsSeeding(true);
    try {
      console.log('🌱 Starting marketplace seed...');

      // Providers data
      const providers: Array<{
        id: string;
        name: string;
        type: ProviderType;
        accreditation: string;
        country: string;
        website_url: string;
        active: boolean;
      }> = [
        { id: 'a1b2c3d4-0001-0000-0000-000000000001', name: 'Coursera', type: 'mooc' as const, accreditation: 'Accredited', country: 'US', website_url: 'https://coursera.org', active: true },
        { id: 'a1b2c3d4-0002-0000-0000-000000000002', name: 'Sophia Learning', type: 'mooc' as const, accreditation: 'ACE Approved', country: 'US', website_url: 'https://sophia.org', active: true },
        { id: 'a1b2c3d4-0003-0000-0000-000000000003', name: 'Study.com', type: 'mooc' as const, accreditation: 'ACE Approved', country: 'US', website_url: 'https://study.com', active: true },
        { id: 'a1b2c3d4-0004-0000-0000-000000000004', name: 'Straighterline', type: 'mooc' as const, accreditation: 'ACE Approved', country: 'US', website_url: 'https://straighterline.com', active: true },
        { id: 'a1b2c3d4-0005-0000-0000-000000000005', name: 'edX', type: 'mooc' as const, accreditation: 'Accredited', country: 'US', website_url: 'https://edx.org', active: true },
        { id: 'a1b2c3d4-0006-0000-0000-000000000006', name: 'CLEP', type: 'testing_center' as const, accreditation: 'College Board', country: 'US', website_url: 'https://clep.collegeboard.org', active: true }
      ];

      // Insert providers
      const { error: provError } = await supabase
        .from('providers')
        .upsert(providers, { onConflict: 'id', ignoreDuplicates: true });

      if (provError) {
        console.error('Provider insert error:', provError);
        throw provError;
      }

      console.log('✅ Providers seeded:', providers.length);

      // Marketplace courses data
      const marketplaceCourses: Array<{
        id: string;
        provider_id: string;
        code: string;
        title: string;
        description: string;
        credits: number;
        level: number;
        modality: ModalityType;
        duration_weeks: number;
        cost_usd: number;
        skill_tags: string[];
        active: boolean;
      }> = [
        // CS-101 options
        { id: 'b1c2d3e4-0001-0000-0000-000000000001', provider_id: 'a1b2c3d4-0001-0000-0000-000000000001', code: 'COUR-CS-101', title: 'Programming Fundamentals I', description: 'Introduction to programming concepts using Python', credits: 3, level: 100, modality: 'online' as const, duration_weeks: 8, cost_usd: 199, skill_tags: ['python', 'programming', 'algorithms'], active: true },
        { id: 'b1c2d3e4-0002-0000-0000-000000000002', provider_id: 'a1b2c3d4-0002-0000-0000-000000000002', code: 'SOPH-CS-101', title: 'Introduction to Programming', description: 'Self-paced intro to programming', credits: 3, level: 100, modality: 'online' as const, duration_weeks: 4, cost_usd: 70, skill_tags: ['python', 'programming'], active: true },
        { id: 'b1c2d3e4-0003-0000-0000-000000000003', provider_id: 'a1b2c3d4-0003-0000-0000-000000000003', code: 'SDC-CS-101', title: 'Computer Science 101', description: 'Comprehensive programming course', credits: 3, level: 100, modality: 'online' as const, duration_weeks: 6, cost_usd: 85, skill_tags: ['java', 'programming'], active: true },

        // CS-102 options
        { id: 'b1c2d3e4-0004-0000-0000-000000000004', provider_id: 'a1b2c3d4-0001-0000-0000-000000000001', code: 'COUR-CS-102', title: 'Programming Fundamentals II', description: 'Advanced programming with data structures', credits: 3, level: 100, modality: 'online' as const, duration_weeks: 8, cost_usd: 199, skill_tags: ['python', 'data-structures'], active: true },
        { id: 'b1c2d3e4-0005-0000-0000-000000000005', provider_id: 'a1b2c3d4-0004-0000-0000-000000000004', code: 'SL-CS-102', title: 'Computer Science 102', description: 'Object-oriented programming fundamentals', credits: 3, level: 100, modality: 'online' as const, duration_weeks: 4, cost_usd: 99, skill_tags: ['java', 'oop'], active: true },
        { id: 'b1c2d3e4-0006-0000-0000-000000000006', provider_id: 'a1b2c3d4-0005-0000-0000-000000000005', code: 'EDX-CS-102', title: 'Intermediate Programming', description: 'Data structures and algorithms', credits: 3, level: 100, modality: 'online' as const, duration_weeks: 10, cost_usd: 149, skill_tags: ['python', 'algorithms'], active: true },

        // MATH-241 options
        { id: 'b1c2d3e4-0007-0000-0000-000000000007', provider_id: 'a1b2c3d4-0001-0000-0000-000000000001', code: 'COUR-MATH-241', title: 'Calculus I', description: 'Single-variable calculus', credits: 4, level: 200, modality: 'online' as const, duration_weeks: 12, cost_usd: 249, skill_tags: ['calculus', 'mathematics'], active: true },
        { id: 'b1c2d3e4-0008-0000-0000-000000000008', provider_id: 'a1b2c3d4-0002-0000-0000-000000000002', code: 'SOPH-MATH-241', title: 'Calculus', description: 'Self-paced calculus course', credits: 4, level: 200, modality: 'online' as const, duration_weeks: 6, cost_usd: 90, skill_tags: ['calculus', 'mathematics'], active: true },
        { id: 'b1c2d3e4-0009-0000-0000-000000000009', provider_id: 'a1b2c3d4-0006-0000-0000-000000000006', code: 'CLEP-CALC', title: 'CLEP Calculus Exam', description: 'Calculus CLEP examination', credits: 4, level: 200, modality: 'in_person' as const, duration_weeks: 1, cost_usd: 89, skill_tags: ['calculus', 'exam'], active: true },

        // ENG-101 options
        { id: 'b1c2d3e4-0010-0000-0000-000000000010', provider_id: 'a1b2c3d4-0002-0000-0000-000000000002', code: 'SOPH-ENG-101', title: 'English Composition I', description: 'Academic writing fundamentals', credits: 3, level: 100, modality: 'online' as const, duration_weeks: 4, cost_usd: 70, skill_tags: ['writing', 'composition'], active: true },
        { id: 'b1c2d3e4-0011-0000-0000-000000000011', provider_id: 'a1b2c3d4-0003-0000-0000-000000000003', code: 'SDC-ENG-101', title: 'Composition I', description: 'College writing course', credits: 3, level: 100, modality: 'online' as const, duration_weeks: 6, cost_usd: 85, skill_tags: ['writing', 'english'], active: true },
        { id: 'b1c2d3e4-0012-0000-0000-000000000012', provider_id: 'a1b2c3d4-0006-0000-0000-000000000006', code: 'CLEP-COMP', title: 'CLEP College Composition', description: 'English composition exam', credits: 3, level: 100, modality: 'in_person' as const, duration_weeks: 1, cost_usd: 89, skill_tags: ['writing', 'exam'], active: true },

        // CS-201 options
        { id: 'b1c2d3e4-0013-0000-0000-000000000013', provider_id: 'a1b2c3d4-0001-0000-0000-000000000001', code: 'COUR-CS-201', title: 'Data Structures', description: 'Advanced data structures and algorithms', credits: 3, level: 200, modality: 'online' as const, duration_weeks: 10, cost_usd: 249, skill_tags: ['data-structures', 'algorithms'], active: true },
        { id: 'b1c2d3e4-0014-0000-0000-000000000014', provider_id: 'a1b2c3d4-0005-0000-0000-000000000005', code: 'EDX-CS-201', title: 'Data Structures & Algorithms', description: 'Comprehensive DS&A course', credits: 3, level: 200, modality: 'online' as const, duration_weeks: 12, cost_usd: 199, skill_tags: ['data-structures', 'algorithms'], active: true },
        { id: 'b1c2d3e4-0015-0000-0000-000000000015', provider_id: 'a1b2c3d4-0004-0000-0000-000000000004', code: 'SL-CS-201', title: 'Data Structures', description: 'Core data structures implementation', credits: 3, level: 200, modality: 'online' as const, duration_weeks: 6, cost_usd: 119, skill_tags: ['data-structures', 'java'], active: true },

        // CS-301 options
        { id: 'b1c2d3e4-0016-0000-0000-000000000016', provider_id: 'a1b2c3d4-0001-0000-0000-000000000001', code: 'COUR-CS-301', title: 'Algorithm Design', description: 'Advanced algorithm design and analysis', credits: 3, level: 300, modality: 'online' as const, duration_weeks: 10, cost_usd: 299, skill_tags: ['algorithms', 'complexity'], active: true },
        { id: 'b1c2d3e4-0017-0000-0000-000000000017', provider_id: 'a1b2c3d4-0005-0000-0000-000000000005', code: 'EDX-CS-301', title: 'Algorithms', description: 'Algorithm design techniques', credits: 3, level: 300, modality: 'online' as const, duration_weeks: 14, cost_usd: 249, skill_tags: ['algorithms', 'optimization'], active: true }
      ];

      // Insert marketplace courses
      const { error: mktError } = await supabase
        .from('marketplace_courses')
        .upsert(marketplaceCourses, { onConflict: 'id', ignoreDuplicates: true });

      if (mktError) {
        console.error('Marketplace courses insert error:', mktError);
        throw mktError;
      }

      console.log('✅ Marketplace courses seeded:', marketplaceCourses.length);

      // Verify counts
      const { count: provCount } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true });

      const { count: mktCount } = await supabase
        .from('marketplace_courses')
        .select('*', { count: 'exact', head: true });

      toast.success(
        `Marketplace seeded successfully!`,
        { description: `${provCount} providers, ${mktCount} courses` }
      );

      // Refresh the page to load new data
      setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
      console.error('Seeding failed:', error);
      toast.error('Failed to seed marketplace', {
        description: error.message || 'Check console for details'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg">
      <div className="flex items-start gap-3">
        <Database className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
            Marketplace Database Empty
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
            No providers or courses found. Seed sample data to enable the marketplace and graph view.
          </p>
          <Button 
            onClick={seedMarketplace} 
            disabled={isSeeding}
            size="sm"
            variant="outline"
            className="border-amber-600 text-amber-900 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-950"
          >
            {isSeeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Seeding Database...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Quick Seed Marketplace
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
