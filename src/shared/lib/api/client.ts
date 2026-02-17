/**
 * Single import point for the Supabase client in the API layer.
 * All API modules import from here — never from @/integrations directly.
 */
export { supabase } from '@/integrations/supabase/client';
