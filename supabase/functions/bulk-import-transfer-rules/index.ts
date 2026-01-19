import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';
import { corsHeaders } from '../_shared/util.ts';
import { checkV1InstitutionScope } from '../_shared/policyGate.ts';

interface TransferRule {
  source_institution: string;
  source_course_code: string;
  target_institution: string;
  target_course_code: string | null;
  acceptance_status: 'accepted' | 'elective' | 'rejected';
  rule_source?: string;
  confidence?: number;
  evidence_url?: string;
}

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { rules } = await req.json() as { rules: TransferRule[] };

    if (!Array.isArray(rules) || rules.length === 0) {
      throw new Error('Invalid input: rules array required');
    }

    // V1 SCOPE ENFORCEMENT: Verify all target_institution values are in V1 scope
    const uniqueTargets = new Set(rules.map(r => r.target_institution?.toUpperCase?.()?.trim?.()).filter(Boolean));
    for (const target of uniqueTargets) {
      const scopeCheck = checkV1InstitutionScope(target as string);
      if (!scopeCheck.allowed) {
        console.warn(`[bulk-import-transfer-rules] V1 scope block: ${scopeCheck.reason}`);
        return new Response(
          JSON.stringify({ error: 'INSTITUTION_NOT_IN_V1_SCOPE', message: scopeCheck.reason }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`📥 Processing ${rules.length} transfer rules for bulk import`);

    const result: ImportResult = {
      total: rules.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Fetch existing rules to check for duplicates
    const { data: existingRules, error: fetchError } = await supabaseClient
      .from('credit_transfer_rules')
      .select('source_institution, source_course_code, target_institution, id');

    if (fetchError) {
      console.error('Error fetching existing rules:', fetchError);
      throw new Error('Failed to fetch existing rules');
    }

    const existingKeys = new Set(
      (existingRules || []).map((r: any) => 
        `${r.source_institution}|${r.source_course_code}|${r.target_institution}`
      )
    );

    const existingMap = new Map(
      (existingRules || []).map((r: any) => [
        `${r.source_institution}|${r.source_course_code}|${r.target_institution}`,
        r.id
      ])
    );

    // Process rules in batches
    const BATCH_SIZE = 50;
    const toInsert: TransferRule[] = [];
    const toUpdate: Array<TransferRule & { id: string }> = [];

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const key = `${rule.source_institution}|${rule.source_course_code}|${rule.target_institution}`;

      try {
        // Validate acceptance_status
        if (!['accepted', 'elective', 'rejected'].includes(rule.acceptance_status)) {
          result.errors.push(`Rule ${i + 1}: Invalid acceptance_status '${rule.acceptance_status}'`);
          result.skipped++;
          continue;
        }

        if (existingKeys.has(key)) {
          // Update existing rule with new data
          const existingId = existingMap.get(key);
          if (existingId) {
            toUpdate.push({ ...rule, id: existingId });
          }
        } else {
          toInsert.push(rule);
        }
      } catch (error) {
        result.errors.push(`Rule ${i + 1}: ${error instanceof Error ? error.message : 'Validation error'}`);
        result.skipped++;
      }
    }

    // Batch insert new rules
    if (toInsert.length > 0) {
      console.log(`📝 Inserting ${toInsert.length} new rules`);
      
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabaseClient
          .from('credit_transfer_rules')
          .insert(batch);

        if (insertError) {
          console.error('Batch insert error:', insertError);
          result.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`);
        } else {
          result.inserted += batch.length;
        }
      }
    }

    // Batch update existing rules
    if (toUpdate.length > 0) {
      console.log(`🔄 Updating ${toUpdate.length} existing rules`);
      
      for (const rule of toUpdate) {
        const { id, ...updateData } = rule;
        const { error: updateError } = await supabaseClient
          .from('credit_transfer_rules')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          console.error('Update error:', updateError);
          result.errors.push(`Update ${id}: ${updateError.message}`);
        } else {
          result.updated++;
        }
      }
    }

    console.log(`✅ Import complete: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Import failed' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
