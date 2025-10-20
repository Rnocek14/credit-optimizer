import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function SeedV5Database() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const { toast } = useToast();

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const seedDatabase = async () => {
    setIsSeeding(true);
    setLog([]);
    
    try {
      addLog('🌱 Starting V5 Database Seed...\n');

      // Create providers
      const providers = [
        { id: crypto.randomUUID(), name: 'Coursera', website: 'https://coursera.org', accreditation_status: 'accredited' },
        { id: crypto.randomUUID(), name: 'edX', website: 'https://edx.org', accreditation_status: 'accredited' },
        { id: crypto.randomUUID(), name: 'Udacity', website: 'https://udacity.com', accreditation_status: 'recognized' }
      ];

      const { error: provError } = await supabase.from('course_providers' as any).upsert(providers, { onConflict: 'name' });
      if (provError) {
        addLog(`❌ Provider seed error: ${provError.message}`);
        throw provError;
      }
      addLog(`✓ Providers seeded: ${providers.length}`);

      // Create edu courses
      const eduCourses = [
        { id: crypto.randomUUID(), code: 'CS101', title: 'Intro to Computer Science', credits: 3 },
        { id: crypto.randomUUID(), code: 'MATH201', title: 'Calculus I', credits: 3 },
        { id: crypto.randomUUID(), code: 'CS201', title: 'Data Structures', credits: 3 },
        { id: crypto.randomUUID(), code: 'CS301', title: 'Algorithms', credits: 3 }
      ];

      const { error: eduError } = await supabase.from('edu_courses' as any).upsert(eduCourses, { onConflict: 'code' });
      if (eduError) {
        addLog(`❌ Edu courses seed error: ${eduError.message}`);
        throw eduError;
      }
      addLog(`✓ Edu courses seeded: ${eduCourses.length}`);

      // Create marketplace courses
      const marketplaceCourses = [
        { 
          id: crypto.randomUUID(), 
          code: 'COUR-CS-101', 
          title: 'Programming Foundations', 
          credits: 3, 
          cost_usd: 49, 
          duration_weeks: 6,
          provider_id: providers[0].id 
        },
        { 
          id: crypto.randomUUID(), 
          code: 'EDX-MATH-101', 
          title: 'Mathematical Thinking', 
          credits: 3, 
          cost_usd: 99, 
          duration_weeks: 8,
          provider_id: providers[1].id 
        },
        { 
          id: crypto.randomUUID(), 
          code: 'UDAC-DS-201', 
          title: 'Data Structures Nanodegree', 
          credits: 3, 
          cost_usd: 399, 
          duration_weeks: 12,
          provider_id: providers[2].id 
        },
        { 
          id: crypto.randomUUID(), 
          code: 'COUR-ALG-301', 
          title: 'Algorithm Design', 
          credits: 3, 
          cost_usd: 79, 
          duration_weeks: 10,
          provider_id: providers[0].id 
        }
      ];

      const { error: mktError } = await supabase.from('marketplace_courses' as any).upsert(marketplaceCourses, { onConflict: 'code' });
      if (mktError) {
        addLog(`❌ Marketplace courses seed error: ${mktError.message}`);
        throw mktError;
      }
      addLog(`✓ Marketplace courses seeded: ${marketplaceCourses.length}`);

      // Delete existing requirements for bs_cs
      const { error: deleteError } = await supabase
        .from('program_requirements' as any)
        .delete()
        .eq('program_id', 'bs_cs');
      
      if (deleteError) {
        addLog(`❌ Delete requirements error: ${deleteError.message}`);
        throw deleteError;
      }
      addLog('✓ Cleared existing bs_cs requirements');

      // Create requirements
      const requirements = [
        { id: crypto.randomUUID(), program_id: 'bs_cs', year: 1, category: 'foundation', name: 'Foundations', description: 'Core programming foundations', credits_required: 6 },
        { id: crypto.randomUUID(), program_id: 'bs_cs', year: 2, category: 'core', name: 'Core I', description: 'Data structures and algorithms', credits_required: 6 },
        { id: crypto.randomUUID(), program_id: 'bs_cs', year: 3, category: 'specialization', name: 'Specialization', description: 'Track-specific courses', credits_required: 6 },
        { id: crypto.randomUUID(), program_id: 'bs_cs', year: 4, category: 'capstone', name: 'Capstone', description: 'Final project and electives', credits_required: 6 }
      ];

      const { error: reqError } = await supabase.from('program_requirements' as any).insert(requirements);
      if (reqError) {
        addLog(`❌ Requirements seed error: ${reqError.message}`);
        throw reqError;
      }
      addLog(`✓ Program requirements seeded: ${requirements.length}`);

      // Create requirement options
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

      const { error: optError } = await supabase.from('requirement_options' as any).upsert(options, { onConflict: 'requirement_id,option_ref_id' });
      if (optError) {
        addLog(`❌ Options seed error: ${optError.message}`);
        throw optError;
      }
      addLog(`✓ Requirement options seeded: ${options.length}`);

      addLog('\n✨ Seeding complete!');
      
      toast({
        title: "Database Seeded Successfully!",
        description: "All 4 years with 6 credits each are now in the database.",
      });
    } catch (error) {
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

        <Button 
          onClick={seedDatabase} 
          disabled={isSeeding}
          size="lg"
          className="w-full"
        >
          {isSeeding ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Seeding Database...
            </>
          ) : (
            '🌱 Seed Database'
          )}
        </Button>
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
