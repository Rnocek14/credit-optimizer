import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, Copy, CheckCheck, Trash2, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function OptimizerDataSeeder() {
  const [setupStatus, setSetupStatus] = useState<{
    checking: boolean;
    passed: boolean;
    missingItems: string[];
  }>({ checking: false, passed: false, missingItems: [] });
  
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

  const openSeedingScript = () => {
    const scriptPath = '/scripts/seed-optimizer-complete.sql';
    window.open(scriptPath, '_blank');
    toast({
      title: "SQL Script Opened",
      description: "Copy the entire script and run it in Supabase SQL Editor",
    });
  };

  const getCleanupScript = () => {
    return `-- ============================================================================
-- OPTIMIZER CLEANUP SCRIPT  
-- ============================================================================
-- Run this FIRST if you're getting "policy already exists" errors
-- This removes all optimizer tables and policies for a fresh start
-- ============================================================================

-- Drop all RLS policies (both old and new naming conventions)
DROP POLICY IF EXISTS "Anyone can view alt_credits" ON public.alt_credits;
DROP POLICY IF EXISTS "Public read access" ON public.alt_credits;
DROP POLICY IF EXISTS "Allow public read access to alt credits" ON public.alt_credits;
DROP POLICY IF EXISTS "Authenticated users can insert alt credits" ON public.alt_credits;
DROP POLICY IF EXISTS "Service role can manage alt_credits" ON public.alt_credits;

DROP POLICY IF EXISTS "Anyone can view equivalencies" ON public.cross_institution_equivalencies;
DROP POLICY IF EXISTS "Public read access" ON public.cross_institution_equivalencies;
DROP POLICY IF EXISTS "Allow public read access to equivalencies" ON public.cross_institution_equivalencies;
DROP POLICY IF EXISTS "Authenticated users can insert equivalencies" ON public.cross_institution_equivalencies;
DROP POLICY IF EXISTS "Service role can manage equivalencies" ON public.cross_institution_equivalencies;

DROP POLICY IF EXISTS "Anyone can view templates" ON public.degree_templates;
DROP POLICY IF EXISTS "Public read access" ON public.degree_templates;
DROP POLICY IF EXISTS "Allow public read access to degree templates" ON public.degree_templates;
DROP POLICY IF EXISTS "Authenticated users can insert degree templates" ON public.degree_templates;
DROP POLICY IF EXISTS "Service role can manage templates" ON public.degree_templates;

DROP POLICY IF EXISTS "Anyone can view frameworks" ON public.gened_frameworks;
DROP POLICY IF EXISTS "Public read access" ON public.gened_frameworks;
DROP POLICY IF EXISTS "Service role can manage frameworks" ON public.gened_frameworks;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.gened_categories;
DROP POLICY IF EXISTS "Public read access" ON public.gened_categories;
DROP POLICY IF EXISTS "Service role can manage categories" ON public.gened_categories;

DROP POLICY IF EXISTS "Anyone can view limits" ON public.institution_credit_limits;
DROP POLICY IF EXISTS "Public read access" ON public.institution_credit_limits;
DROP POLICY IF EXISTS "Service role can manage limits" ON public.institution_credit_limits;

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS public.gened_categories CASCADE;
DROP TABLE IF EXISTS public.gened_frameworks CASCADE;
DROP TABLE IF EXISTS public.cross_institution_equivalencies CASCADE;
DROP TABLE IF EXISTS public.degree_templates CASCADE;
DROP TABLE IF EXISTS public.institution_credit_limits CASCADE;
DROP TABLE IF EXISTS public.alt_credits CASCADE;

SELECT 'Cleanup complete! Run the setup script next.' as status;`;
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

  const copyCleanupScript = () => {
    navigator.clipboard.writeText(getCleanupScript());
    toast({
      title: "Copied!",
      description: "Cleanup script copied to clipboard",
    });
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Optimizer Database Setup</CardTitle>
        <CardDescription>
          Follow these steps to set up optimizer database tables and seed initial data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 0: Cleanup (Optional) */}
        <div className="space-y-3 p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
              0
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Cleanup Script (Optional)
              </h3>
              <p className="text-sm text-muted-foreground">
                If you're getting "policy already exists" errors, run this cleanup script FIRST to remove old tables and policies.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCleanupScript}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Cleanup Script
              </Button>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ Only run this if you have existing optimizer tables causing conflicts
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Copy SQL Script */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-sm font-semibold">Run SQL Script</h3>
          </div>
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
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-sm font-semibold">Verify Setup</h3>
          </div>
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

        {/* Step 3: Seed Data (SQL-based) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-sm font-semibold">Seed Optimizer Data</h3>
          </div>
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>SQL-Based Seeding (Recommended)</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">
                After setup verification passes, open the seeding script below and run it in Supabase SQL Editor.
              </p>
              <p className="text-sm font-semibold">
                This seeds: 50 alt credits + 50 equivalencies + TESU BSBA template
              </p>
            </AlertDescription>
          </Alert>
          <Button 
            onClick={openSeedingScript}
            disabled={!setupStatus.passed}
            variant="default"
            className="w-full"
          >
            <Database className="mr-2 h-4 w-4" />
            Open Seeding SQL Script
          </Button>
          <p className="text-xs text-muted-foreground">
            💡 Running SQL directly bypasses RLS and ensures all data is seeded correctly
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
