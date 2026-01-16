/**
 * Get Effective Invariant Config
 * 
 * Admin-only endpoint that returns the computed effective invariant config
 * for an institution + template status. This allows the admin UI to display
 * "Stored vs Effective" without computing on the frontend.
 * 
 * Query params:
 * - institution_code: string (required)
 * - template_status: 'active' | 'pending_review' | undefined (optional)
 * 
 * Returns: EffectiveInvariantConfig
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  fetchInstitutionOverridesBase,
  computeEffectiveThreshold,
  DEFAULT_INVARIANT_CONFIG,
  type EffectiveInvariantConfig,
} from '../_shared/institutionOverrides.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const institutionCode = url.searchParams.get('institution_code');
    const templateStatus = url.searchParams.get('template_status') || undefined;

    if (!institutionCode) {
      return new Response(
        JSON.stringify({ error: 'institution_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Fetch base config (merged with defaults)
    const baseConfig = await fetchInstitutionOverridesBase(supabase, institutionCode);

    // Compute effective threshold based on template status
    const effectiveThreshold = computeEffectiveThreshold(baseConfig, templateStatus);

    // Build response with both stored and effective values
    const response: EffectiveInvariantConfig & {
      requestedStatus: string | null;
      effectiveThresholdForStatus: number;
      baseThreshold: number;
    } = {
      ...baseConfig,
      // Override the threshold with the status-adjusted one
      unknownCreditsWarnThreshold: effectiveThreshold,
      // Include additional context for UI
      requestedStatus: templateStatus || null,
      effectiveThresholdForStatus: effectiveThreshold,
      baseThreshold: baseConfig.unknownCreditsWarnThreshold,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching effective config:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch effective config',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
