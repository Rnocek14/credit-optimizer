import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TransferRule {
  source_institution: string;
  source_course_code: string;
  target_institution: string;
  target_course_code: string | null;
  acceptance_status: string;
  rule_source: string;
  confidence: number;
  evidence_url?: string;
}

export interface SeedProgress {
  total: number;
  processed: number;
  inserted: number;
  skipped: number;
  errors: number;
}

export interface ClientSeedResult {
  success: boolean;
  stats: SeedProgress;
  error?: string;
  runAt: string;
}

// Comprehensive transfer rules from CS and BSBA pathways
const TRANSFER_RULES: TransferRule[] = [
  // ============================================================================
  // SOPHIA LEARNING → TESU (General Education)
  // ============================================================================
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENG-COMP-I-II', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-COLLEGE-ALG', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-STATISTICS', target_institution: 'TESU', target_course_code: 'STA-201', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-ETHICS', target_institution: 'TESU', target_course_code: 'PHI-384', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-I', target_institution: 'TESU', target_course_code: 'ART-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-II', target_institution: 'TESU', target_course_code: 'ART-102', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PHILO', target_institution: 'TESU', target_course_code: 'PHI-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PSYCH', target_institution: 'TESU', target_course_code: 'PSY-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-SOC', target_institution: 'TESU', target_course_code: 'SOC-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-I', target_institution: 'TESU', target_course_code: 'HIS-113', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-II', target_institution: 'TESU', target_course_code: 'HIS-114', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MACROECONOMICS', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MICROECONOMICS', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-HUMAN-BIO', target_institution: 'TESU', target_course_code: 'BIO-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENV-SCI', target_institution: 'TESU', target_course_code: 'ENV-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-CHEM', target_institution: 'TESU', target_course_code: 'CHE-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
  { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-PUBLIC-SPEAK', target_institution: 'TESU', target_course_code: 'COM-209', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },

  // ============================================================================
  // STUDY.COM → TESU (CS Core & Upper Division)
  // ============================================================================
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-INTRO-CS', target_institution: 'TESU', target_course_code: 'COS-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-PYTHON', target_institution: 'TESU', target_course_code: 'COS-161', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-JAVA-PROG', target_institution: 'TESU', target_course_code: 'COS-162', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATA-STRUCT', target_institution: 'TESU', target_course_code: 'COS-265', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-COMP-ARCH', target_institution: 'TESU', target_course_code: 'COS-231', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-CALC-I', target_institution: 'TESU', target_course_code: 'MAT-231', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-CALC-II', target_institution: 'TESU', target_course_code: 'MAT-232', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-DISCRETE-MATH', target_institution: 'TESU', target_course_code: 'MAT-210', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-LINEAR-ALG', target_institution: 'TESU', target_course_code: 'MAT-250', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-PROB-STATS', target_institution: 'TESU', target_course_code: 'STA-215', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-ALGORITHMS', target_institution: 'TESU', target_course_code: 'COS-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-OS', target_institution: 'TESU', target_course_code: 'COS-341', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATABASE', target_institution: 'TESU', target_course_code: 'COS-350', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-NET-FUND', target_institution: 'TESU', target_course_code: 'COS-360', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-SOFTWARE-ENG', target_institution: 'TESU', target_course_code: 'COS-421', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-THEORY-COMP', target_institution: 'TESU', target_course_code: 'COS-311', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-INFO-SEC', target_institution: 'TESU', target_course_code: 'COS-340', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-AI-ML', target_institution: 'TESU', target_course_code: 'COS-470', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-WEB-DEV', target_institution: 'TESU', target_course_code: 'COS-310', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-CLOUD-COMP', target_institution: 'TESU', target_course_code: null, acceptance_status: 'elective', rule_source: 'ACE Credit', confidence: 0.85 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-MOBILE-DEV', target_institution: 'TESU', target_course_code: null, acceptance_status: 'elective', rule_source: 'ACE Credit', confidence: 0.85 },
  { source_institution: 'STUDYCOM', source_course_code: 'SDC-DEVOPS', target_institution: 'TESU', target_course_code: null, acceptance_status: 'elective', rule_source: 'ACE Credit', confidence: 0.85 },

  // ============================================================================
  // STUDY.COM → TESU (Business Core)
  // ============================================================================
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

  // ============================================================================
  // TESU INSTITUTIONAL COURSES (Residency Credits)
  // ============================================================================
  { source_institution: 'TESU', source_course_code: 'TESU-CS-CAPSTONE', target_institution: 'TESU', target_course_code: 'COS-495', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00 },
  { source_institution: 'TESU', source_course_code: 'TESU-CS-ETHICS', target_institution: 'TESU', target_course_code: 'COS-420', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00 },
  { source_institution: 'TESU', source_course_code: 'TESU-SR-SEMINAR', target_institution: 'TESU', target_course_code: 'LIB-495', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00 },
  { source_institution: 'TESU', source_course_code: 'TESU-TECH-WRITING', target_institution: 'TESU', target_course_code: 'ENG-321', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00 },
  { source_institution: 'TESU', source_course_code: 'TESU-PROJ-MGMT', target_institution: 'TESU', target_course_code: 'MAN-375', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00 },

  // ============================================================================
  // CLEP EXAMS → TESU (Testing Credit)
  // ============================================================================
  { source_institution: 'CLEP', source_course_code: 'CLEP-COLLEGE-COMP', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00 },
  { source_institution: 'CLEP', source_course_code: 'CLEP-CALCULUS', target_institution: 'TESU', target_course_code: 'MAT-231', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00 },
  { source_institution: 'CLEP', source_course_code: 'CLEP-PSYCH', target_institution: 'TESU', target_course_code: 'PSY-101', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00 },
  { source_institution: 'CLEP', source_course_code: 'CLEP-SOCIOLOGY', target_institution: 'TESU', target_course_code: 'SOC-101', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00 },
  { source_institution: 'CLEP', source_course_code: 'CLEP-INFO-SYS', target_institution: 'TESU', target_course_code: 'CIS-211', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00 },
  { source_institution: 'CLEP', source_course_code: 'CLEP-MACRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00 },
  { source_institution: 'CLEP', source_course_code: 'CLEP-MICRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00 },
];

export function useClientSideSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState<SeedProgress>({ total: 0, processed: 0, inserted: 0, skipped: 0, errors: 0 });
  const [lastResult, setLastResult] = useState<ClientSeedResult | null>(() => {
    try {
      const stored = localStorage.getItem('client-seed-transfer-rules-result');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const seedTransferRules = useCallback(async (): Promise<ClientSeedResult> => {
    setIsSeeding(true);
    setError(null);
    setProgress({ total: TRANSFER_RULES.length, processed: 0, inserted: 0, skipped: 0, errors: 0 });

    const stats: SeedProgress = {
      total: TRANSFER_RULES.length,
      processed: 0,
      inserted: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      // Use upsert for all rules at once - much faster than one-by-one
      const { data, error: upsertError } = await supabase
        .from('credit_transfer_rules')
        .upsert(
          TRANSFER_RULES.map(rule => ({
            source_institution: rule.source_institution,
            source_course_code: rule.source_course_code,
            target_institution: rule.target_institution,
            target_course_code: rule.target_course_code,
            acceptance_status: rule.acceptance_status,
            rule_source: rule.rule_source,
            confidence: rule.confidence,
            evidence_url: rule.evidence_url || null,
          })),
          { 
            onConflict: 'source_institution,source_course_code,target_institution',
            ignoreDuplicates: true 
          }
        )
        .select();

      if (upsertError) {
        throw upsertError;
      }

      // Count results
      stats.processed = TRANSFER_RULES.length;
      stats.inserted = data?.length || 0;
      stats.skipped = TRANSFER_RULES.length - (data?.length || 0);

      setProgress(stats);

      const result: ClientSeedResult = {
        success: true,
        stats,
        runAt: new Date().toISOString(),
      };

      // Cache result
      localStorage.setItem('client-seed-transfer-rules-result', JSON.stringify(result));
      setLastResult(result);
      setIsSeeding(false);

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error during seeding';
      console.error('[useClientSideSeeder] Seeding failed:', err);
      
      stats.errors = 1;
      setProgress(stats);
      setError(errorMsg);
      setIsSeeding(false);

      const result: ClientSeedResult = {
        success: false,
        stats,
        error: errorMsg,
        runAt: new Date().toISOString(),
      };

      return result;
    }
  }, []);

  const clearResult = useCallback(() => {
    localStorage.removeItem('client-seed-transfer-rules-result');
    setLastResult(null);
    setError(null);
    setProgress({ total: 0, processed: 0, inserted: 0, skipped: 0, errors: 0 });
  }, []);

  return {
    seedTransferRules,
    isSeeding,
    progress,
    lastResult,
    error,
    clearResult,
    totalRules: TRANSFER_RULES.length,
  };
}
