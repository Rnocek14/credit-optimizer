import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sprout, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SeedTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showSchemaHelp, setShowSchemaHelp] = useState(false);

  const handleSeed = async () => {
    setIsRunning(true);
    setShowSchemaHelp(false);
    
    try {
      console.log('🌱 Running database seeds...');
      
      const { data, error } = await supabase.functions.invoke('run-seeds');

      if (error) {
        console.error('❌ Edge function error:', error);
        setShowSchemaHelp(true);
        toast.error('Edge function unavailable', {
          description: 'Use the manual SQL method shown below',
          duration: 10000
        });
        return;
      }

      if (!data.success) {
        console.error('❌ Seed operation failed:', data);
        setShowSchemaHelp(true);
        toast.error(data.error || 'Seeding failed', {
          description: data.hint || 'Use manual SQL method below',
          duration: 8000
        });
        return;
      }

      const stats = data.stats || { inserted: 0, skipped: 0, total: 0 };
      
      if (data.alreadySeeded) {
        toast.info('Seeds already in database', {
          description: `${stats.total} transfer rules found`
        });
      } else {
        toast.success('✅ Seeds applied successfully!', {
          description: `Inserted ${stats.inserted} transfer rules`
        });
      }
      
      setHasRun(true);
      console.log('✅ Seed complete:', data);
      
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
            Copy and run this SQL in <strong>Cloud → Database → Insert Data</strong>
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
              Cloud → Database → Insert Data
            </code>
          </div>
        </div>
      )}
    </>
  );
}
