import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  fetchEduCourses,
  fetchProgramRequirements,
  deleteProgramRequirements,
  deleteRequirementOptions,
  insertProgramRequirements,
  insertRequirementOptions,
  upsertProviders,
  upsertEduCourses,
  upsertMarketplaceCourses,
} from '@/shared/lib/api/devTools';

export default function SeedV5Database() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const { toast } = useToast();

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const logErr = (label: string, err: any) => {
    const msg = typeof err?.message === 'string' ? err.message : JSON.stringify(err);
    const code = err?.code ? ` [${err.code}]` : '';
    addLog(`❌ ${label}:${code} ${msg}`);
  };

  const seedLiteDatabase = async () => {
    setIsSeeding(true);
    setLog([]);

    try {
      addLog('🌱 Starting **LITE** seed (requirements + options using existing edu_courses)…\n');

      const programId = 'bs_cs';
      addLog('✓ Using program_id: bs_cs');

      addLog('→ Fetching existing edu_courses');
      const eduData = await fetchEduCourses(8);
      if (!eduData || eduData.length < 2) {
        addLog('⚠️ Need at least 2 edu_courses to create options. Add a couple in Supabase and re-run.');
        return;
      }
      addLog(`✓ Found ${eduData.length} edu_courses`);

      addLog('→ Clearing existing requirements for program (best effort)');
      const existingReqs = await fetchProgramRequirements(programId);
      const existingReqIds = existingReqs.map((r: any) => r.id);
      if (existingReqIds.length) {
        await deleteRequirementOptions(existingReqIds).catch((e: any) => addLog(`   (note) delete options: ${e.message}`));
      }
      await deleteProgramRequirements(programId).catch((e: any) => addLog(`   (note) delete requirements: ${e.message}`));
      addLog('✓ Cleared existing');

      addLog('→ Inserting program_requirements (Years 1–4, 6 cr each)');
      const requirements = [
        { id: crypto.randomUUID(), program_id: programId, year: 1, category: 'foundation', name: 'Foundations', credits_required: 6, description: 'Core programming foundations' },
        { id: crypto.randomUUID(), program_id: programId, year: 2, category: 'core', name: 'Core I', credits_required: 6, description: 'Data structures and algorithms' },
        { id: crypto.randomUUID(), program_id: programId, year: 3, category: 'specialization', name: 'Specialization', credits_required: 6, description: 'Track-specific courses' },
        { id: crypto.randomUUID(), program_id: programId, year: 4, category: 'capstone', name: 'Capstone', credits_required: 6, description: 'Final project and electives' },
      ];
      const reqData = await insertProgramRequirements(requirements);
      addLog(`✓ Inserted ${reqData?.length ?? 0} requirements`);

      addLog('→ Inserting requirement_options (3 edu options per requirement)');
      const edu = eduData as unknown as Array<{ id: string; credits?: number }>;
      const reqs = (reqData as any) as Array<{ id: string; year: number }>;
      const optionsPerReq = Math.min(3, edu.length);
      const makeOptsForReq = (reqIndex: number, requirementId: string) => {
        const start = reqIndex % edu.length;
        const picks = new Set<string>();
        let i = 0;
        while (picks.size < optionsPerReq && i < edu.length * 2) {
          picks.add(edu[(start + i) % edu.length].id);
          i++;
        }
        return Array.from(picks).map((courseId) => ({
          id: crypto.randomUUID(),
          requirement_id: requirementId,
          option_kind: 'course' as const,
          option_ref_id: courseId,
          credits_awarded: 3,
          transfer_eligible: true,
        }));
      };
      const opts = reqs.flatMap((req, idx) => makeOptsForReq(idx, req.id));
      const optData = await insertRequirementOptions(opts);
      addLog(`✓ Inserted ${optData?.length ?? 0} options`);

      addLog('\n✨ LITE seeding complete! Open /edu-tree-v5?db=1 and hard refresh.');
      toast({ title: 'Lite Seeded', description: 'Years 1–4 added with 6 credits each (edu only).' });
    } catch (e: any) {
      logErr('Seeder failed', e);
      toast({ title: 'Seeding Failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  };

  const seedDatabase = async () => {
    setIsSeeding(true);
    setLog([]);
    
    try {
      addLog('🌱 Starting V5 Database Seed...\n');

      const providers = [
        { id: crypto.randomUUID(), name: 'Coursera', website_url: 'https://coursera.org', accreditation: 'accredited', type: 'mooc' as const },
        { id: crypto.randomUUID(), name: 'edX', website_url: 'https://edx.org', accreditation: 'accredited', type: 'mooc' as const },
        { id: crypto.randomUUID(), name: 'Udacity', website_url: 'https://udacity.com', accreditation: 'recognized', type: 'mooc' as const }
      ];

      await upsertProviders(providers);
      addLog(`✓ Providers seeded: ${providers.length}`);

      const eduCourses = [
        { id: crypto.randomUUID(), code: 'CS101', title: 'Intro to Computer Science', credits: 3 },
        { id: crypto.randomUUID(), code: 'MATH201', title: 'Calculus I', credits: 3 },
        { id: crypto.randomUUID(), code: 'CS201', title: 'Data Structures', credits: 3 },
        { id: crypto.randomUUID(), code: 'CS301', title: 'Algorithms', credits: 3 }
      ];

      await upsertEduCourses(eduCourses);
      addLog(`✓ Edu courses seeded: ${eduCourses.length}`);

      const marketplaceCourses = [
        { id: crypto.randomUUID(), code: 'COUR-CS-101', title: 'Programming Foundations', credits: 3, cost_usd: 49, duration_weeks: 6, provider_id: providers[0].id },
        { id: crypto.randomUUID(), code: 'EDX-MATH-101', title: 'Mathematical Thinking', credits: 3, cost_usd: 99, duration_weeks: 8, provider_id: providers[1].id },
        { id: crypto.randomUUID(), code: 'UDAC-DS-201', title: 'Data Structures Nanodegree', credits: 3, cost_usd: 399, duration_weeks: 12, provider_id: providers[2].id },
        { id: crypto.randomUUID(), code: 'COUR-ALG-301', title: 'Algorithm Design', credits: 3, cost_usd: 79, duration_weeks: 10, provider_id: providers[0].id }
      ];

      await upsertMarketplaceCourses(marketplaceCourses);
      addLog(`✓ Marketplace courses seeded: ${marketplaceCourses.length}`);

      await deleteProgramRequirements('bs_cs');
      addLog('✓ Cleared existing bs_cs requirements');

      const requirements = [
        { id: crypto.randomUUID(), program_id: 'bs_cs', year: 1, category: 'foundation', name: 'Foundations', description: 'Core programming foundations', credits_required: 6 },
        { id: crypto.randomUUID(), program_id: 'bs_cs', year: 2, category: 'core', name: 'Core I', description: 'Data structures and algorithms', credits_required: 6 },
        { id: crypto.randomUUID(), program_id: 'bs_cs', year: 3, category: 'specialization', name: 'Specialization', description: 'Track-specific courses', credits_required: 6 },
        { id: crypto.randomUUID(), program_id: 'bs_cs', year: 4, category: 'capstone', name: 'Capstone', description: 'Final project and electives', credits_required: 6 }
      ];

      await insertProgramRequirements(requirements);
      addLog(`✓ Program requirements seeded: ${requirements.length}`);

      const options = requirements.flatMap((req, idx) => [
        {
          id: crypto.randomUUID(),
          requirement_id: req.id,
          option_kind: 'course' as const,
          option_ref_id: eduCourses[idx]?.id || eduCourses[0].id,
          credits_awarded: 3,
          transfer_eligible: true
        },
        {
          id: crypto.randomUUID(),
          requirement_id: req.id,
          option_kind: 'course' as const,
          option_ref_id: marketplaceCourses[idx]?.id || marketplaceCourses[0].id,
          credits_awarded: 3,
          transfer_eligible: true
        }
      ]);

      await insertRequirementOptions(options);
      addLog(`✓ Requirement options seeded: ${options.length}`);

      addLog('\n✨ Seeding complete!');
      
      toast({
        title: "Database Seeded Successfully!",
        description: "All 4 years with 6 credits each are now in the database.",
      });
    } catch (error) {
      logErr('Seeding failed', error);
      toast({
        title: "Seeding Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">V5 Database Seeder</h1>
      
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <p className="text-muted-foreground mb-4">
          This will populate the database with sample data for the EduTree V5 interface:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
          <li>3 course providers (Coursera, edX, Udacity)</li>
          <li>4 educational courses</li>
          <li>4 marketplace courses</li>
          <li>4 program requirements (Years 1-4, 6 credits each)</li>
          <li>8 requirement options (course alternatives)</li>
        </ul>

        <div className="flex gap-3">
          <Button 
            onClick={seedDatabase} 
            disabled={isSeeding}
            size="lg"
            className="flex-1"
          >
            {isSeeding ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Seeding...
              </>
            ) : (
              '🌱 Full Seed'
            )}
          </Button>
          
          <Button 
            onClick={seedLiteDatabase} 
            disabled={isSeeding}
            size="lg"
            variant="outline"
            className="flex-1"
          >
            {isSeeding ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Seeding...
              </>
            ) : (
              '🌱 Lite Seed (edu only)'
            )}
          </Button>
        </div>
      </div>

      {log.length > 0 && (
        <div className="bg-muted rounded-lg p-4 font-mono text-sm">
          {log.map((line, idx) => (
            <div key={idx} className="mb-1">{line}</div>
          ))}
        </div>
      )}

      {!isSeeding && log.length > 0 && log[log.length - 1].includes('complete') && (
        <div className="mt-6 bg-primary/10 border border-primary rounded-lg p-4">
          <p className="font-semibold mb-2">Next Steps:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Visit <a href="/edu-tree-v5?db=1" className="text-primary underline">/edu-tree-v5?db=1</a></li>
            <li>Clear cache: Open DevTools → Console → Type: <code className="bg-muted px-2 py-1 rounded">localStorage.clear(); location.reload();</code></li>
            <li>You should now see all 4 years with modules showing "0/6 cr"</li>
          </ol>
        </div>
      )}
    </div>
  );
}
