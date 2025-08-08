import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://vzpissitddpunkpythsb.supabase.co';
const anon = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI';

const supabase = createClient(url, anon);

function ok(name: string) { console.log(`✅ ${name}`); }
function fail(name: string, reason: string) { console.error(`❌ ${name}: ${reason}`); }

async function run() {
  try {
    // generate-roadmap
    {
      const { data, error } = await supabase.functions.invoke('generate-roadmap', { body: { goal: 'PM', user_skills: ['SQL'] } });
      if (error) throw new Error(error.message);
      if (data?.steps && data?.fastest_path && data?.lowest_cost_path && data?.highest_roi_path) ok('generate-roadmap'); else fail('generate-roadmap', 'missing keys');
    }
    // assign-badges
    {
      const { data, error } = await supabase.functions.invoke('assign-badges', { body: { user_id: '2b458624-d498-4cca-a63d-9341cc20e363' } });
      if (error) throw new Error(error.message);
      if (Array.isArray(data?.would_award)) ok('assign-badges'); else fail('assign-badges', 'missing would_award');
    }
    // autonomous-workflow-engine
    {
      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', { body: { workflow_template: 'demo' } });
      if (error) throw new Error(error.message);
      if (Array.isArray(data?.steps) && typeof data?.progress === 'number') ok('autonomous-workflow-engine'); else fail('autonomous-workflow-engine', 'missing steps/progress');
    }
    // getMentorCurationQueue (GET)
    {
      const { data, error } = await supabase.functions.invoke('getMentorCurationQueue', { method: 'GET' as any });
      if (error) throw new Error(error.message);
      if (Array.isArray(data?.items)) ok('getMentorCurationQueue'); else fail('getMentorCurationQueue', 'missing items');
    }
    // course-path-integrator
    {
      const { data, error } = await supabase.functions.invoke('course-path-integrator', { body: { plan_id: '2b458624-d498-4cca-a63d-9341cc20e363', action: 'approve' } });
      if (error) throw new Error(error.message);
      if (data?.diff?.added_steps) ok('course-path-integrator'); else fail('course-path-integrator', 'missing diff');
    }
    // pdf-export
    {
      const { data, error } = await supabase.functions.invoke('pdf-export', { body: { resume_id: '2b458624-d498-4cca-a63d-9341cc20e363' } });
      if (error) throw new Error(error.message);
      if (data?.url) ok('pdf-export'); else fail('pdf-export', 'missing url');
    }
    // verify-certificate
    {
      const { data, error } = await supabase.functions.invoke('verify-certificate', { body: { code: 'demo-123' } });
      if (error) throw new Error(error.message);
      if (data?.valid) ok('verify-certificate'); else fail('verify-certificate', 'not valid');
    }
  } catch (e: any) {
    console.error('Test run failed:', e?.message || e);
    process.exitCode = 1;
  }
}

run();
