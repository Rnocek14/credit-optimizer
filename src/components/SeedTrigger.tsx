import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sprout, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SEED_DATA = [
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENG-COMP-I-II', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-I', target_institution: 'TESU', target_course_code: 'HIS-113', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-COLLEGE-ALG', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-ETHICS', target_institution: 'TESU', target_course_code: 'PHI-384', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-I', target_institution: 'TESU', target_course_code: 'ART-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PSYCH', target_institution: 'TESU', target_course_code: 'PSY-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-SOC', target_institution: 'TESU', target_course_code: 'SOC-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-HUMAN-BIO', target_institution: 'TESU', target_course_code: 'BIO-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENV-SCI', target_institution: 'TESU', target_course_code: 'ENV-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-PUBLIC-SPEAK', target_institution: 'TESU', target_course_code: 'COM-209', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MGMT', target_institution: 'TESU', target_course_code: 'MAN-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MKT', target_institution: 'TESU', target_course_code: 'MAR-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-FIN-ACCT', target_institution: 'TESU', target_course_code: 'ACC-102', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-MGT-ACCT', target_institution: 'TESU', target_course_code: 'ACC-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-MICRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-MACRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-INFO-SYS', target_institution: 'TESU', target_course_code: 'CIS-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ETH', target_institution: 'TESU', target_course_code: 'BUS-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-CORP-FIN', target_institution: 'TESU', target_course_code: 'FIN-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-LAW', target_institution: 'TESU', target_course_code: 'BUS-311', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-HR-MGMT', target_institution: 'TESU', target_course_code: 'HRM-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-PROJ-MGMT', target_institution: 'TESU', target_course_code: 'MAN-341', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-SUPPLY-CHAIN', target_institution: 'TESU', target_course_code: 'OPM-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ANALYTICS', target_institution: 'TESU', target_course_code: 'BUS-351', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-ENTREPRENEUR', target_institution: 'TESU', target_course_code: 'ENT-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-DIGITAL-MKT', target_institution: 'TESU', target_course_code: 'MAR-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-CONSUMER-BEH', target_institution: 'TESU', target_course_code: 'MAR-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-RESEARCH-METH', target_institution: 'TESU', target_course_code: 'BUS-401', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATA-DECISIONS', target_institution: 'TESU', target_course_code: 'BUS-411', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
];

export function SeedTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showSchemaHelp, setShowSchemaHelp] = useState(false);

  const handleSeed = async () => {
    setIsRunning(true);
    setShowSchemaHelp(false);
    
    try {
      console.log('🌱 Seeding database directly...');
      
      // Check current count
      const { count, error: countError } = await supabase
        .from('credit_transfer_rules')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Database error:', countError);
        setShowSchemaHelp(true);
        toast.error('Database table not found', {
          description: 'Use the manual SQL method shown below to create the table',
          duration: 10000
        });
        return;
      }

      const expectedCount = SEED_DATA.length;
      
      if (count && count >= expectedCount) {
        toast.info('Seeds already complete', {
          description: `All ${count} transfer rules present`
        });
        setHasRun(true);
        console.log(`✅ Database already seeded with ${count} rules`);
        return;
      }

      // Insert seed data
      const { data, error } = await supabase
        .from('credit_transfer_rules')
        .insert(SEED_DATA)
        .select();

      if (error) {
        console.error('❌ Insert error:', error);
        setShowSchemaHelp(true);
        toast.error('Failed to insert seeds', {
          description: error.message || 'Use manual SQL method below',
          duration: 8000
        });
        return;
      }

      const inserted = data?.length || 0;
      toast.success('✅ Seeds applied successfully!', {
        description: `Inserted ${inserted} transfer rules`
      });
      
      setHasRun(true);
      console.log(`✅ Successfully seeded ${inserted} transfer rules`);
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      setShowSchemaHelp(true);
      toast.error('Failed to apply seeds', {
        description: 'Use manual SQL method shown below'
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSeed}
        disabled={isRunning || hasRun}
        variant={hasRun ? "outline" : "default"}
        size="sm"
        className="flex items-center gap-2"
      >
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : hasRun ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <Sprout className="w-4 h-4" />
        )}
        {isRunning ? 'Seeding...' : hasRun ? 'Seeds Applied' : 'Apply Database Seeds'}
      </Button>
      
      {showSchemaHelp && (
        <div className="mt-2 p-3 border border-amber-500/30 bg-amber-500/10 rounded-md text-xs space-y-2 max-w-2xl">
          <p className="font-medium text-amber-700 dark:text-amber-300">
            Manual Seed Method (Recommended)
          </p>
          <p className="text-muted-foreground">
            Copy and run this SQL in <strong>Supabase Dashboard → SQL Editor</strong>
          </p>
          <details className="text-muted-foreground">
            <summary className="cursor-pointer font-medium mb-2 hover:text-foreground">
              Click to see complete SQL (schema + data)
            </summary>
            <pre className="text-[10px] bg-background/50 p-2 rounded overflow-x-auto max-h-64 border">
{`-- Fix schema and seed data in one go
DROP TABLE IF EXISTS credit_transfer_rules CASCADE;

CREATE TABLE credit_transfer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_institution TEXT NOT NULL,
  source_course_code TEXT NOT NULL,
  target_institution TEXT NOT NULL,
  target_course_code TEXT NOT NULL,
  acceptance_status TEXT NOT NULL CHECK (acceptance_status IN ('accepted', 'conditional', 'rejected', 'pending')),
  rule_source TEXT,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_institution, source_course_code, target_institution, target_course_code)
);

ALTER TABLE credit_transfer_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON credit_transfer_rules FOR SELECT TO public USING (true);
CREATE POLICY "Auth insert" ON credit_transfer_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update" ON credit_transfer_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_transfer_source ON credit_transfer_rules(source_institution, source_course_code);
CREATE INDEX idx_transfer_target ON credit_transfer_rules(target_institution, target_course_code);

-- Insert 23 transfer rules
INSERT INTO credit_transfer_rules (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence) VALUES
('SOPHIA', 'SOPHIA-ENG-COMP-I-II', 'TESU', 'ENG-101', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-US-HIST-I', 'TESU', 'HIS-113', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-COLLEGE-ALG', 'TESU', 'MAT-121', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-INTRO-ETHICS', 'TESU', 'PHI-384', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-ART-HIST-I', 'TESU', 'ART-101', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-INTRO-PSYCH', 'TESU', 'PSY-101', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-INTRO-SOC', 'TESU', 'SOC-101', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-HUMAN-BIO', 'TESU', 'BIO-101', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-ENV-SCI', 'TESU', 'ENV-101', 'accepted', 'ACE Credit', 0.95),
('SOPHIA', 'SOPHIA-PUBLIC-SPEAK', 'TESU', 'COM-209', 'accepted', 'ACE Credit', 0.95),
('STUDYCOM', 'SDC-PRIN-MGMT', 'TESU', 'MAN-321', 'accepted', 'ACE Credit', 0.92),
('STUDYCOM', 'SDC-PRIN-MKT', 'TESU', 'MAR-301', 'accepted', 'ACE Credit', 0.92),
('STUDYCOM', 'SDC-FIN-ACCT', 'TESU', 'ACC-102', 'accepted', 'ACE Credit', 0.92),
('STUDYCOM', 'SDC-MGT-ACCT', 'TESU', 'ACC-301', 'accepted', 'ACE Credit', 0.92),
('STUDYCOM', 'SDC-MICRO-ECON', 'TESU', 'ECO-211', 'accepted', 'ACE Credit', 0.92),
('STUDYCOM', 'SDC-MACRO-ECON', 'TESU', 'ECO-212', 'accepted', 'ACE Credit', 0.92),
('STUDYCOM', 'SDC-INFO-SYS', 'TESU', 'CIS-301', 'accepted', 'ACE Credit', 0.92),
('STUDYCOM', 'SDC-BUS-ETH', 'TESU', 'BUS-331', 'accepted', 'ACE Credit', 0.90),
('STUDYCOM', 'SDC-CORP-FIN', 'TESU', 'FIN-321', 'accepted', 'ACE Credit', 0.90),
('STUDYCOM', 'SDC-BUS-LAW', 'TESU', 'BUS-311', 'accepted', 'ACE Credit', 0.90),
('STUDYCOM', 'SDC-HR-MGMT', 'TESU', 'HRM-301', 'accepted', 'ACE Credit', 0.90),
('STUDYCOM', 'SDC-PROJ-MGMT', 'TESU', 'MAN-341', 'accepted', 'ACE Credit', 0.90),
('STUDYCOM', 'SDC-SUPPLY-CHAIN', 'TESU', 'OPM-301', 'accepted', 'ACE Credit', 0.90),
('STUDYCOM', 'SDC-BUS-ANALYTICS', 'TESU', 'BUS-351', 'accepted', 'ACE Credit', 0.90),
('STUDYCOM', 'SDC-ENTREPRENEUR', 'TESU', 'ENT-301', 'accepted', 'ACE Credit', 0.88),
('STUDYCOM', 'SDC-DIGITAL-MKT', 'TESU', 'MAR-331', 'accepted', 'ACE Credit', 0.88),
('STUDYCOM', 'SDC-CONSUMER-BEH', 'TESU', 'MAR-321', 'accepted', 'ACE Credit', 0.88),
('STUDYCOM', 'SDC-RESEARCH-METH', 'TESU', 'BUS-401', 'accepted', 'ACE Credit', 0.88),
('STUDYCOM', 'SDC-DATA-DECISIONS', 'TESU', 'BUS-411', 'accepted', 'ACE Credit', 0.88);`}
            </pre>
          </details>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-medium">📍 Location:</span>
            <code className="text-xs bg-background/70 px-2 py-0.5 rounded">
              Supabase Dashboard → SQL Editor
            </code>
          </div>
        </div>
      )}
    </>
  );
}
