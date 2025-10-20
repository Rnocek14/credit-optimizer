import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import type { TransferRule } from './useTransferRules';

export type TransferFitLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface TransferFit {
  level: TransferFitLevel;
  reason: string;
}

interface MarketplaceCourse {
  id: string;
  provider?: {
    name?: string;
    type?: string | null;
    accreditation?: string | null;
  } | null;
}

export function useTransferAnalysis(programId: string, transferRules: TransferRule[]) {
  const { data: equivalenceData } = useQuery({
    queryKey: ['equivalence-members', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equivalence_group_members')
        .select('course_id, source, confidence');
      
      if (error) throw error;
      
      return new Map(
        (data || []).map(e => [e.course_id, { source: e.source, confidence: e.confidence }])
      );
    },
    staleTime: 10 * 60 * 1000,
  });

  const getTransferFit = useCallback((courseId: string, course?: MarketplaceCourse): TransferFit => {
    const equivalence = equivalenceData?.get(courseId);
    
    // Excellent: ACE/NCCRS or explicit articulation
    if (equivalence?.source === 'ACE' || equivalence?.source === 'NCCRS') {
      return { 
        level: 'excellent', 
        reason: `${equivalence.source}-recommended • Low acceptance risk` 
      };
    }
    
    // Good: Regionally accredited university
    if (course?.provider?.accreditation?.includes('regional') && 
        course?.provider?.type === 'university') {
      return { 
        level: 'good', 
        reason: 'Regionally accredited university • Prior acceptance precedent' 
      };
    }
    
    // Fair: Accredited provider, no precedent
    if (course?.provider?.accreditation) {
      return { 
        level: 'fair', 
        reason: 'Accredited provider • No transfer precedent' 
      };
    }
    
    // Poor: Unknown
    return { 
      level: 'poor', 
      reason: 'Unknown transferability • Registrar review required' 
    };
  }, [equivalenceData]);

  return { getTransferFit };
}
