import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Database, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export function OptimizerDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [setupStatus, setSetupStatus] = useState<{
    isReady: boolean;
    missingItems: string[];
    message: string;
  } | null>(null);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-optimizer-setup');
      
      if (error) {
        console.error('[OptimizerDataSeeder] Setup check error:', error);
        setSetupStatus({
          isReady: false,
          missingItems: ['Setup check failed'],
          message: 'Could not verify setup status',
        });
        return;
      }

      setSetupStatus(data);
    } catch (error) {
      console.error('[OptimizerDataSeeder] Setup check failed:', error);
      setSetupStatus({
        isReady: false,
        missingItems: ['Setup check failed'],
        message: 'Could not verify setup status',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      console.log('[OptimizerDataSeeder] Starting seed...');
      
      const { data, error } = await supabase.functions.invoke('seed-optimizer-data', {
        body: {}
      });

      if (error) {
        console.error('[OptimizerDataSeeder] Error:', error);
        toast.error('Failed to seed optimizer data');
        return;
      }

      console.log('[OptimizerDataSeeder] Result:', data);
      toast.success(
        `Optimizer data seeded successfully! ${data.counts.alt_credits} courses, ${data.counts.equivalencies} equivalencies, ${data.counts.degree_templates} template.`
      );
      
      // Refresh setup status
      await checkSetup();
      
    } catch (error) {
      console.error('[OptimizerDataSeeder] Failed:', error);
      toast.error('Failed to seed optimizer data');
    } finally {
      setIsSeeding(false);
    }
  };

  const copyToClipboard = async () => {
    const sqlScript = `-- Run this in your Supabase SQL Editor
-- This creates all necessary optimizer tables and the TESU institution

-- Step 1: Add code column to institutions table
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

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

-- Step 5: Insert TESU institution if not exists
INSERT INTO public.institutions (name, code, type, reputation_score, verification_status, metadata)
VALUES (
  'Thomas Edison State University',
  'TESU',
  'university',
  85,
  'verified',
  '{}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- Verify setup
SELECT 
  'alt_credits' as table_name, COUNT(*) as row_count FROM public.alt_credits
UNION ALL
SELECT 'cross_institution_equivalencies', COUNT(*) FROM public.cross_institution_equivalencies
UNION ALL
SELECT 'degree_templates', COUNT(*) FROM public.degree_templates
UNION ALL
SELECT 'gened_frameworks', COUNT(*) FROM public.gened_frameworks
UNION ALL
SELECT 'gened_categories', COUNT(*) FROM public.gened_categories
UNION ALL
SELECT 'institution_credit_limits', COUNT(*) FROM public.institution_credit_limits
UNION ALL
SELECT 'TESU institution', COUNT(*) FROM public.institutions WHERE code = 'TESU';`;

    await navigator.clipboard.writeText(sqlScript);
    toast.success('SQL script copied to clipboard!');
  };

  if (isChecking) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking database setup...</p>
        </div>
      </Card>
    );
  }

  if (!setupStatus?.isReady) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold">Setup Required</h3>
            <p className="text-sm text-muted-foreground">
              Database tables need to be created first
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Database Components</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {setupStatus?.missingItems.map((item, idx) => (
                <div key={idx} className="text-xs">• {item}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="text-sm">
            <p className="font-semibold mb-2">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Copy the SQL script below</li>
              <li>Open your Supabase Dashboard → SQL Editor</li>
              <li>Paste and run the script</li>
              <li>Return here and click "Check Setup Again"</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button onClick={copyToClipboard} variant="outline" size="sm" className="flex-1">
              <Copy className="mr-2 h-4 w-4" />
              Copy SQL Script
            </Button>
            <Button onClick={checkSetup} variant="outline" size="sm">
              Check Setup Again
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              The SQL script creates all necessary tables and inserts the TESU institution.
              This is a one-time setup that takes about 10 seconds to run.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold">Ready to Seed Data</h3>
          <p className="text-sm text-muted-foreground">
            All database tables are set up correctly
          </p>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>This will populate:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>50 alternative credit sources (CLEP, DSST, Sophia, Study.com)</li>
          <li>50 course equivalencies to TESU</li>
          <li>1 TESU BSBA cheapest degree template</li>
        </ul>
      </div>

      <Button 
        onClick={handleSeed} 
        disabled={isSeeding}
        className="w-full"
      >
        {isSeeding ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Seeding Data...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            Seed Optimizer Data
          </>
        )}
      </Button>
    </Card>
  );
}
