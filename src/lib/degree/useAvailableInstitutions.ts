/**
 * Hook to fetch available institutions from database
 * Falls back to static list if DB unavailable
 * 
 * V1 scope is now database-driven via institution_v1_scope table.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAvailableInstitutions as getStaticInstitutions } from './institutionPolicies';
import { isV1InstitutionAsync } from './v1Scope';

export interface AvailableInstitution {
  code: string;
  name: string;
  status: 'active' | 'draft' | 'static';
  confidence: number;
  source: 'pack' | 'static' | 'template';
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
  // Additional schools from scrape_url_templates
  NU: 'National University',
  PHOENIX: 'University of Phoenix',
  PSUWC: 'Penn State World Campus',
  PURDUEG: 'Purdue University Global',
  STRAYER: 'Strayer University',
  UPEOPLE: 'University of the People',
  UWFO: 'University of Wisconsin Flexible Option',
  WALDEN: 'Walden University',
  WCU: 'Western Carolina University',
};

function getInstitutionName(code: string): string {
  return INSTITUTION_NAMES[code] ?? code;
}

interface PolicyPackRow {
  institution: string;
  status: string;
  confidence_score: number;
}

// V1 Scope: Imported from shared config (src/lib/degree/v1Scope.ts)
// Based on evidence coverage audit (TESU 78.8%, COSC 83.1%, WGU 56.9%)
// EXCELSIOR/EMPIRE excluded until evidence coverage reaches 50%+

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
        // ONLY fetch ACTIVE packs with COMPLETE required fields
        // This gates the selector to only show institutions that can build valid degrees
        // @ts-ignore - table exists after scraper runs
        const { data, error } = await supabase
          .from('institution_policy_packs' as any)
          .select('institution, status, confidence_score, policy_data')
          .eq('status', 'active')
          .order('confidence_score', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          for (const rawRow of data) {
            const row = rawRow as unknown as PolicyPackRow & { policy_data: any };
            if (seenCodes.has(row.institution)) continue;
            
            // GATE: Only include if ALL required fields are present for degree buildability
            // AND provenance is verified AND bucket mode is known
            const pd = row.policy_data || {};
            const gradeRules = pd.grade_rules || {};
            const bucketMode = pd.transfer_alt_bucket_mode as string | undefined;
            
            // Base required fields (always needed)
            const baseRequiredFields: Record<string, unknown> = {
              residency_credits: pd.residency_credits,
              max_transfer_credits: pd.max_transfer_credits,
              capstone_in_residence: pd.capstone_in_residence,
              degree_credit_total: pd.degree_credit_total,
              min_transfer_grade: gradeRules.min_transfer_grade,
              transfer_alt_bucket_mode: bucketMode,
            };
            
            // Additional required fields based on bucket mode
            if (bucketMode === 'separate') {
              // Separate bucket mode requires explicit max_alt_credit
              baseRequiredFields.max_alt_credit = pd.max_alt_credit ?? pd.transfer_credit_policy?.max_alt_credit;
            } else if (bucketMode === 'combined') {
              // Combined bucket mode requires the combined limit
              baseRequiredFields.max_transfer_alt_combined_credits = pd.max_transfer_alt_combined_credits;
            }
            // 'unknown' bucket mode = not selectable (will fail on bucket_mode check)
            
            const missingFields = Object.entries(baseRequiredFields)
              .filter(([_, v]) => v == null)
              .map(([k]) => k);
            
            // Check provenance_verified_at (required for staleness calculation)
            // Note: excerpt alone is not sufficient - we need a timestamp for staleness
            const verifiedAt = pd.provenance_verified_at ? new Date(pd.provenance_verified_at) : null;
            const hasExcerptOnly = !verifiedAt && pd.provenance_excerpt != null;
            
            // Check staleness: policies verified > 180 days ago are blocked
            const STALENESS_THRESHOLD_DAYS = 180;
            const daysSinceVerified = verifiedAt 
              ? Math.floor((Date.now() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24))
              : Infinity;
            const isStale = daysSinceVerified > STALENESS_THRESHOLD_DAYS;
            
            // Check bucket mode is known (not 'unknown')
            const hasKnownBucketMode = bucketMode === 'separate' || bucketMode === 'combined';
            
            if (missingFields.length > 0) {
              console.warn('[useAvailableInstitutions] Skipping %s: missing required fields: %s', 
                row.institution, missingFields.join(', '));
              continue;
            }
            
            if (!verifiedAt) {
              if (hasExcerptOnly) {
                console.warn('[useAvailableInstitutions] Skipping %s: has provenance_excerpt but missing provenance_verified_at (required for staleness)', 
                  row.institution);
              } else {
                console.warn('[useAvailableInstitutions] Skipping %s: missing provenance verification', 
                  row.institution);
              }
              continue;
            }
            
            if (!hasKnownBucketMode) {
              console.warn('[useAvailableInstitutions] Skipping %s: unknown transfer_alt_bucket_mode (policy shape unverified)', 
                row.institution);
              continue;
            }
            
            if (isStale) {
              console.warn('[useAvailableInstitutions] Skipping %s: policy stale (%d days since verification, max %d)', 
                row.institution, daysSinceVerified, STALENESS_THRESHOLD_DAYS);
              continue;
            }
            
            // P0 Gate: V1 scope restriction - only approved institutions
            // Uses async DB-backed check from institution_v1_scope table
            const isInV1Scope = await isV1InstitutionAsync(row.institution);
            if (!isInV1Scope) {
              console.warn('[useAvailableInstitutions] Skipping %s: not in V1 allowed scope (evidence coverage below threshold)', 
                row.institution);
              continue;
            }
            
            seenCodes.add(row.institution);

            results.push({
              code: row.institution,
              name: getInstitutionName(row.institution),
              status: 'active',
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

      // Add institutions from scrape_url_templates not already in results
      try {
        const { data: templateData } = await supabase
          .from('scrape_url_templates')
          .select('institution_code')
          .order('institution_code');

        if (templateData && Array.isArray(templateData)) {
          for (const row of templateData) {
            const code = (row as { institution_code: string }).institution_code;
            if (seenCodes.has(code)) continue;
            seenCodes.add(code);

            results.push({
              code,
              name: getInstitutionName(code),
              status: 'draft', // Template-only = needs policy scraping
              confidence: 50,  // Low confidence - no policy data yet
              source: 'template',
            });
          }
        }
      } catch (err) {
        console.warn('[useAvailableInstitutions] Failed to fetch templates:', err);
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
