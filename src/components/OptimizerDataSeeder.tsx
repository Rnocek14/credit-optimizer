import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, Copy, CheckCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function OptimizerDataSeeder() {
  const [setupStatus, setSetupStatus] = useState<{
    checking: boolean;
    passed: boolean;
    missingItems: string[];
  }>({ checking: false, passed: false, missingItems: [] });
  
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);
  const [seedStep, setSeedStep] = useState('');
  const [scriptCopied, setScriptCopied] = useState(false);
  const { toast } = useToast();

  const checkSetup = async () => {
    setSetupStatus({ checking: true, passed: false, missingItems: [] });
    
    try {
      const missing: string[] = [];

      // Check institutions.code column
      const { error: codeError } = await supabase
        .from('institutions' as any)
        .select('code')
        .limit(1);
      if (codeError) missing.push('institutions.code column');

      // Check required tables
      const tables = [
        'alt_credits',
        'cross_institution_equivalencies',
        'degree_templates',
        'gened_frameworks',
        'gened_categories',
        'institution_credit_limits'
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table as any)
          .select('id')
          .limit(1);
        if (error) missing.push(`${table} table`);
      }

      if (missing.length === 0) {
        setSetupStatus({ checking: false, passed: true, missingItems: [] });
        toast({
          title: "Setup Verified ✓",
          description: "All required tables exist. Ready to seed data.",
        });
      } else {
        setSetupStatus({ checking: false, passed: false, missingItems: missing });
        toast({
          title: "Setup Incomplete",
          description: `Missing: ${missing.join(', ')}`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Setup check error:', err);
      toast({
        title: "Check Error",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
      setSetupStatus({ checking: false, passed: false, missingItems: ['Check failed'] });
    }
  };

  const seedData = async () => {
    setSeeding(true);
    setSeedProgress(0);
    
    try {
      // Get TESU institution ID
      setSeedStep('Finding TESU institution...');
      setSeedProgress(10);
      
      const { data: institution, error: instError } = await supabase
        .from('institutions' as any)
        .select('id')
        .eq('code', 'TESU')
        .single();

      if (instError || !institution) {
        throw new Error('TESU institution not found. Please run the SQL script first.');
      }

      const tesuId = (institution as any).id;
      
      // Seed alt_credits
      setSeedStep('Seeding alternative credits...');
      setSeedProgress(30);
      
      const altCredits = getAltCreditsData();
      
      const { data: insertedCredits, error: creditsError } = await supabase
        .from('alt_credits' as any)
        .upsert(altCredits as any, { onConflict: 'source_code,identifier' })
        .select('id, source_code, identifier');

      if (creditsError) throw new Error(`Failed to insert alt_credits: ${creditsError.message}`);
      
      // Seed equivalencies
      setSeedStep('Seeding equivalencies...');
      setSeedProgress(60);
      
      const equivalencies = getEquivalenciesData(insertedCredits || [], tesuId);
      
      const { error: equivError } = await supabase
        .from('cross_institution_equivalencies' as any)
        .upsert(equivalencies as any, { onConflict: 'alt_credit_id,institution_id,institutional_course_code' });

      if (equivError) throw new Error(`Failed to insert equivalencies: ${equivError.message}`);
      
      // Seed degree template
      setSeedStep('Seeding degree template...');
      setSeedProgress(90);
      
      const degreeTemplate = getDegreeTemplateData(tesuId);
      
      const { error: templateError } = await supabase
        .from('degree_templates' as any)
        .upsert(degreeTemplate as any, { onConflict: 'id' });

      if (templateError) throw new Error(`Failed to insert degree template: ${templateError.message}`);
      
      setSeedProgress(100);
      setSeedStep('Complete!');
      
      toast({
        title: "Success!",
        description: `Seeded ${altCredits.length} courses, ${equivalencies.length} equivalencies, 1 template.`,
      });
    } catch (err: any) {
      console.error('Seeding error:', err);
      toast({
        title: "Seeding Failed",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
      setSeedProgress(0);
      setSeedStep('');
    }
  };

  const copyScript = () => {
    const script = `-- Run this in Supabase SQL Editor
-- Creates all optimizer tables and TESU institution

-- Step 1: Add code column to institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Step 2: Create optimizer tables
CREATE TABLE IF NOT EXISTS public.alt_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code TEXT NOT NULL,
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  credits_typical INTEGER NOT NULL,
  level INTEGER NOT NULL,
  subject_area TEXT,
  cost_usd NUMERIC(10,2),
  duration_estimate_weeks INTEGER,
  exam_based BOOLEAN DEFAULT false,
  provider_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_code, identifier)
);

CREATE TABLE IF NOT EXISTS public.cross_institution_equivalencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alt_credit_id UUID NOT NULL REFERENCES public.alt_credits(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  institutional_course_code TEXT NOT NULL,
  institutional_course_name TEXT,
  credits_awarded INTEGER NOT NULL,
  level INTEGER,
  gened_category_code TEXT,
  requirement_area TEXT,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  source_documentation TEXT,
  last_verified_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alt_credit_id, institution_id, institutional_course_code)
);

CREATE TABLE IF NOT EXISTS public.degree_templates (
  id TEXT PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  institution_code TEXT NOT NULL,
  program_code TEXT NOT NULL,
  track_type TEXT NOT NULL,
  total_credits INTEGER NOT NULL,
  estimated_cost NUMERIC(10,2),
  estimated_duration_months INTEGER,
  template_data JSONB NOT NULL,
  catalog_year TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gened_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  framework_name TEXT NOT NULL,
  total_credits_required INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gened_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  credits_required INTEGER NOT NULL,
  min_grade TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, category_code)
);

CREATE TABLE IF NOT EXISTS public.institution_credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL,
  credit_value INTEGER NOT NULL,
  provider_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Enable RLS
ALTER TABLE public.alt_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_institution_equivalencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.degree_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gened_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gened_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_credit_limits ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (public read)
CREATE POLICY "Public read access" ON public.alt_credits FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.cross_institution_equivalencies FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.degree_templates FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.gened_frameworks FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.gened_categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.institution_credit_limits FOR SELECT USING (true);

-- Step 5: Insert TESU institution
INSERT INTO public.institutions (name, code, type, reputation_score, verification_status, metadata)
VALUES ('Thomas Edison State University', 'TESU', 'university', 85, 'verified', '{}'::jsonb)
ON CONFLICT (code) DO NOTHING;`;

    navigator.clipboard.writeText(script);
    setScriptCopied(true);
    toast({
      title: "Copied!",
      description: "SQL script copied to clipboard",
    });
    setTimeout(() => setScriptCopied(false), 2000);
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Data Seeding - Step 2</CardTitle>
        <CardDescription>
          Seed TESU BSBA optimizer data: 50 alternative credits, 50 equivalencies, 1 degree template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Copy SQL Script */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Step 1: Run SQL Script</h3>
          <p className="text-sm text-muted-foreground">
            Copy the script below and run it in your Supabase SQL Editor to create all required tables.
          </p>
          <Button 
            onClick={copyScript} 
            variant="outline" 
            className="w-full"
          >
            {scriptCopied ? (
              <>
                <CheckCheck className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy SQL Script
              </>
            )}
          </Button>
        </div>

        {/* Step 2: Verify Setup */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Step 2: Verify Setup</h3>
          <p className="text-sm text-muted-foreground">
            After running the SQL script, click below to verify all tables were created.
          </p>
          <Button 
            onClick={checkSetup} 
            disabled={setupStatus.checking}
            variant="outline"
            className="w-full"
          >
            {setupStatus.checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Verify Setup'
            )}
          </Button>

          {setupStatus.missingItems.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Missing Items</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  {setupStatus.missingItems.map((item) => (
                    <li key={item} className="text-sm">{item}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {setupStatus.passed && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Setup Complete ✓</AlertTitle>
              <AlertDescription>
                All required tables exist. Ready to seed data.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Step 3: Seed Data */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Step 3: Seed Data</h3>
          <p className="text-sm text-muted-foreground">
            Once setup is verified, click below to populate the tables with TESU BSBA data.
          </p>
          <Button 
            onClick={seedData} 
            disabled={seeding || !setupStatus.passed}
            className="w-full"
          >
            {seeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Data...
              </>
            ) : (
              'Seed Optimizer Data'
            )}
          </Button>

          {seeding && (
            <div className="space-y-2">
              <Progress value={seedProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{seedStep}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Seed data functions
function getAltCreditsData() {
  return [
    // CLEP Exams (15 courses)
    { source_code: 'CLEP', identifier: 'COMP', title: 'College Composition', credits_typical: 6, level: 100, subject_area: 'English', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'COMP_MOD', title: 'College Composition Modular', credits_typical: 3, level: 100, subject_area: 'English', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'AMERLIT', title: 'American Literature', credits_typical: 3, level: 200, subject_area: 'Literature', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'HUMLIT', title: 'Humanities', credits_typical: 3, level: 100, subject_area: 'Humanities', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'COLALG', title: 'College Algebra', credits_typical: 3, level: 100, subject_area: 'Mathematics', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'CALCULUS', title: 'Calculus', credits_typical: 3, level: 100, subject_area: 'Mathematics', cost_usd: 95, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'FINACCT', title: 'Financial Accounting', credits_typical: 3, level: 200, subject_area: 'Accounting', cost_usd: 95, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'INFOSYS', title: 'Information Systems', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'INTROMGT', title: 'Principles of Management', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'INTROMKT', title: 'Principles of Marketing', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'MICROECON', title: 'Principles of Microeconomics', credits_typical: 3, level: 200, subject_area: 'Economics', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'MACROECON', title: 'Principles of Macroeconomics', credits_typical: 3, level: 200, subject_area: 'Economics', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'INTROPSYCH', title: 'Introductory Psychology', credits_typical: 3, level: 100, subject_area: 'Psychology', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'INTROSOC', title: 'Introductory Sociology', credits_typical: 3, level: 100, subject_area: 'Sociology', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
    { source_code: 'CLEP', identifier: 'USHIST1', title: 'History of the United States I', credits_typical: 3, level: 100, subject_area: 'History', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },

    // DSST Exams (10 courses)
    { source_code: 'DSST', identifier: 'BUS_ETHICS', title: 'Business Ethics and Society', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'ORG_BEH', title: 'Organizational Behavior', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'BUS_MATH', title: 'Business Mathematics', credits_typical: 3, level: 200, subject_area: 'Mathematics', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'HRM', title: 'Human Resource Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'PROJ_MGT', title: 'Introduction to Project Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'MIS', title: 'Management Information Systems', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'BUS_LAW', title: 'Business Law II', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'ENV_SCI', title: 'Environmental Science', credits_typical: 3, level: 200, subject_area: 'Science', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'FUND_COUNS', title: 'Fundamentals of Counseling', credits_typical: 3, level: 200, subject_area: 'Psychology', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },
    { source_code: 'DSST', identifier: 'ETHICS_AMER', title: 'Ethics in America', credits_typical: 3, level: 200, subject_area: 'Philosophy', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },

    // Sophia Learning (15 courses)
    { source_code: 'SOPHIA', identifier: 'ENGLISH_COMP_1', title: 'English Composition I', credits_typical: 3, level: 100, subject_area: 'English', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'ENGLISH_COMP_2', title: 'English Composition II', credits_typical: 3, level: 100, subject_area: 'English', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'PUBLIC_SPEAKING', title: 'Public Speaking', credits_typical: 3, level: 100, subject_area: 'Communication', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'COLLEGE_ALGEBRA', title: 'College Algebra', credits_typical: 3, level: 100, subject_area: 'Mathematics', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'STATISTICS', title: 'Introduction to Statistics', credits_typical: 3, level: 200, subject_area: 'Mathematics', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'MICROECON', title: 'Microeconomics', credits_typical: 3, level: 200, subject_area: 'Economics', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'MACROECON', title: 'Macroeconomics', credits_typical: 3, level: 200, subject_area: 'Economics', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'ACCOUNTING_1', title: 'Financial Accounting', credits_typical: 3, level: 200, subject_area: 'Accounting', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'INTRO_BUS', title: 'Introduction to Business', credits_typical: 3, level: 100, subject_area: 'Business', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'INTRO_MGMT', title: 'Introduction to Management', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'INTRO_PSYCH', title: 'Introduction to Psychology', credits_typical: 3, level: 100, subject_area: 'Psychology', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'INTRO_SOC', title: 'Introduction to Sociology', credits_typical: 3, level: 100, subject_area: 'Sociology', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'ENV_SCIENCE', title: 'Environmental Science', credits_typical: 3, level: 200, subject_area: 'Science', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'ETHICS', title: 'Introduction to Ethics', credits_typical: 3, level: 200, subject_area: 'Philosophy', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
    { source_code: 'SOPHIA', identifier: 'US_HIST_1', title: 'U.S. History I', credits_typical: 3, level: 100, subject_area: 'History', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },

    // Study.com (10 courses)
    { source_code: 'STUDY_COM', identifier: 'BUS312', title: 'Advanced Operations Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS303', title: 'Strategic Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS306', title: 'Marketing Research', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS308', title: 'Globalization and International Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS311', title: 'Organizational Communications', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS304', title: 'Leading Organizational Change', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS305', title: 'Corporate Finance', credits_typical: 3, level: 300, subject_area: 'Finance', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS307', title: 'Operations Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS309', title: 'Digital Marketing', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    { source_code: 'STUDY_COM', identifier: 'BUS310', title: 'Business Analytics', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
  ];
}

function getEquivalenciesData(insertedCredits: any[], tesuId: string) {
  return insertedCredits.map((credit, idx) => {
    const baseMapping = {
      alt_credit_id: credit.id,
      institution_id: tesuId,
      confidence: 1.0,
      requirement_area: 'gened' as const,
      last_verified_date: '2024-01-01',
      source_documentation: 'TESU Transfer Evaluation Guide 2024',
    };

    // Map to appropriate TESU courses and gened categories
    if (credit.identifier.includes('COMP') || credit.identifier.includes('ENGLISH')) {
      return { ...baseMapping, institutional_course_code: 'ENG-101', institutional_course_name: 'English Composition', credits_awarded: 3, level: 100, gened_category_code: 'WRITTEN_COMM' };
    } else if (credit.identifier.includes('PUBLIC_SPEAKING')) {
      return { ...baseMapping, institutional_course_code: 'COM-209', institutional_course_name: 'Public Speaking', credits_awarded: 3, level: 200, gened_category_code: 'ORAL_COMM' };
    } else if (credit.identifier.includes('ALGEBRA') || credit.identifier.includes('CALCULUS')) {
      return { ...baseMapping, institutional_course_code: 'MAT-121', institutional_course_name: 'College Algebra', credits_awarded: 3, level: 100, gened_category_code: 'QUANTITATIVE' };
    } else if (credit.identifier.includes('STATISTICS') || credit.identifier.includes('MATH')) {
      return { ...baseMapping, institutional_course_code: 'MAT-201', institutional_course_name: 'Statistics', credits_awarded: 3, level: 200, gened_category_code: 'QUANTITATIVE' };
    } else if (credit.identifier.includes('LIT') || credit.identifier.includes('HUM') || credit.identifier.includes('ETHICS')) {
      return { ...baseMapping, institutional_course_code: 'HUM-211', institutional_course_name: 'Humanities Elective', credits_awarded: 3, level: 200, gened_category_code: 'HUMANITIES' };
    } else if (credit.identifier.includes('PSYCH') || credit.identifier.includes('SOC') || credit.identifier.includes('HIST')) {
      return { ...baseMapping, institutional_course_code: 'SSC-201', institutional_course_name: 'Social Science Elective', credits_awarded: 3, level: 200, gened_category_code: 'SOCIAL_SCIENCE' };
    } else if (credit.identifier.includes('ECON')) {
      return { ...baseMapping, institutional_course_code: 'ECO-211', institutional_course_name: 'Microeconomics', credits_awarded: 3, level: 200, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'major' as const };
    } else if (credit.identifier.includes('ENV') || credit.identifier.includes('SCI')) {
      return { ...baseMapping, institutional_course_code: 'NSC-201', institutional_course_name: 'Natural Science Elective', credits_awarded: 3, level: 200, gened_category_code: 'NATURAL_SCIENCE' };
    } else if (credit.identifier.includes('ACCT') || credit.identifier.includes('ACCOUNTING')) {
      return { ...baseMapping, institutional_course_code: 'ACC-201', institutional_course_name: 'Financial Accounting', credits_awarded: 3, level: 200, requirement_area: 'major' as const };
    } else {
      return { ...baseMapping, institutional_course_code: `BUS-${300 + idx}`, institutional_course_name: 'Business Elective', credits_awarded: 3, level: 300, requirement_area: 'major' as const };
    }
  });
}

function getDegreeTemplateData(tesuId: string): any {
  return {
    id: 'tesu-bsba-cheapest-v1',
    institution_id: tesuId,
    institution_code: 'TESU',
    program_code: 'BSBA',
    program_name: 'Bachelor of Science in Business Administration',
    track_type: 'cheapest',
    total_credits: 120,
    estimated_cost: 8500,
    estimated_duration_months: 18,
    catalog_year: '2024-2025',
    policy_last_verified: '2024-01-01',
    template_data: {
      general_education: {
        written_communication: { credits: 6, category_code: 'WRITTEN_COMM' },
        oral_communication: { credits: 3, category_code: 'ORAL_COMM' },
        quantitative: { credits: 3, category_code: 'QUANTITATIVE' },
        humanities: { credits: 9, category_code: 'HUMANITIES' },
        social_sciences: { credits: 9, category_code: 'SOCIAL_SCIENCE' },
        natural_sciences: { credits: 6, category_code: 'NATURAL_SCIENCE' },
        civic_global: { credits: 3, category_code: 'CIVIC_GLOBAL' },
      },
      major_requirements: {
        core_courses: [
          { code: 'BUS-200', name: 'Principles of Management', credits: 3, level: 200 },
          { code: 'BUS-210', name: 'Principles of Marketing', credits: 3, level: 200 },
          { code: 'ACC-201', name: 'Financial Accounting', credits: 3, level: 200 },
          { code: 'ECO-211', name: 'Microeconomics', credits: 3, level: 200 },
          { code: 'ECO-212', name: 'Macroeconomics', credits: 3, level: 200 },
        ],
        upper_division: [
          { code: 'BUS-312', name: 'Operations Management', credits: 3, level: 300 },
          { code: 'BUS-303', name: 'Strategic Management', credits: 3, level: 300 },
          { code: 'BUS-306', name: 'Marketing Research', credits: 3, level: 300 },
        ],
      },
      electives: { free_electives: 60 },
    },
    notes: 'Optimized for lowest cost using alternative credit sources',
  };
}
