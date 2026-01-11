/**
 * Hook to fetch available institutions from database
 * Falls back to static list if DB unavailable
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAvailableInstitutions as getStaticInstitutions } from './institutionPolicies';

export interface AvailableInstitution {
  code: string;
  name: string;
  status: 'active' | 'draft' | 'static';
  confidence: number;
  source: 'pack' | 'static';
}

// Mapping from DB institution codes to display names
const INSTITUTION_NAMES: Record<string, string> = {
  TESU: 'Thomas Edison State University',
  WGU: 'Western Governors University',
  UMGC: 'University of Maryland Global Campus',
  COSC: 'Charter Oak State College',
  SNHU: 'Southern New Hampshire University',
  EMPIRE: 'Empire State University',
  EXCELSIOR: 'Excelsior University',
  EXCEL: 'Excelsior University',
  UMPI: 'University of Maine at Presque Isle',
  ASUO: 'Arizona State University Online',
  ASU: 'Arizona State University',
  LIBERTY: 'Liberty University Online',
  CSUG: 'Colorado State University Global',
  FRANKLIN: 'Franklin University',
  CAPELLA: 'Capella University',
  GCU: 'Grand Canyon University',
  PURDUE: 'Purdue University Global',
  WALDENU: 'Walden University',
  UMass: 'UMass Lowell',
};

function getInstitutionName(code: string): string {
  return INSTITUTION_NAMES[code] ?? code;
}

interface PolicyPackRow {
  institution: string;
  status: string;
  confidence_score: number;
}

/**
 * Fetch available institutions from database
 * Combines scraped policy packs with static policies
 */
export function useAvailableInstitutions() {
  return useQuery({
    queryKey: ['available-institutions'],
    queryFn: async (): Promise<AvailableInstitution[]> => {
      const results: AvailableInstitution[] = [];
      const seenCodes = new Set<string>();

      try {
        // Fetch ALL institutions, ordered by confidence (we'll pick the best per institution)
        // Include deprecated as fallback - better to show all scraped schools
        // @ts-ignore - table exists after scraper runs
        const { data, error } = await supabase
          .from('institution_policy_packs' as any)
          .select('institution, status, confidence_score')
          .order('confidence_score', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          // Group by institution, take highest confidence per institution
          for (const rawRow of data) {
            const row = rawRow as unknown as PolicyPackRow;
            if (seenCodes.has(row.institution)) continue;
            seenCodes.add(row.institution);

            // Map status: active/draft stay as-is, deprecated/superseded shown as 'draft' (needs review)
            const displayStatus = (row.status === 'active') ? 'active' 
              : (row.status === 'draft') ? 'draft' 
              : 'draft'; // deprecated/superseded shown as needing review

            results.push({
              code: row.institution,
              name: getInstitutionName(row.institution),
              status: displayStatus,
              confidence: row.confidence_score,
              source: 'pack',
            });
          }
        }
      } catch (err) {
        console.warn('[useAvailableInstitutions] DB query failed, using static only:', err);
      }

      // Add static policies not already in results
      const staticCodes = getStaticInstitutions();
      for (const code of staticCodes) {
        if (seenCodes.has(code)) continue;
        seenCodes.add(code);

        results.push({
          code,
          name: getInstitutionName(code),
          status: 'static',
          confidence: 75, // Static policies have moderate confidence
          source: 'static',
        });
      }

      // Sort: active first, then draft, then static; within each, by confidence desc
      const statusOrder = { active: 0, draft: 1, static: 2 };
      results.sort((a, b) => {
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return b.confidence - a.confidence;
      });

      console.log('[useAvailableInstitutions] Found %d institutions', results.length);
      return results;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
