/**
 * Domain types for institutions — derived from Database row types.
 */
import type { Database } from '@/integrations/supabase/types';

/** Full institutions row from Supabase */
export type InstitutionRow = Database['public']['Tables']['institutions']['Row'];

/** Slim institution used in UI consumers */
export interface InstitutionLite {
  id: string;
  code: string;
  name: string;
  accreditation_level: string | null;
}
