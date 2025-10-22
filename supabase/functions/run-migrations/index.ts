import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import postgres from 'https://esm.sh/postgres@3.4.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { confirm } = await req.json();
    if (!confirm) {
      return new Response(
        JSON.stringify({ error: 'Confirmation required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      console.error('SUPABASE_DB_URL not found');
      return new Response(
        JSON.stringify({ error: 'Database URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Connecting to database...');
    const sql = postgres(dbUrl);

    // Check if tables already exist
    const checkTables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('providers', 'requirement_catalog', 'partner_policies', 'credit_transfer_rules', 'option_exclusions')
    `;

    if (checkTables.length === 5) {
      console.log('All tables already exist');
      await sql.end();
      return new Response(
        JSON.stringify({ alreadyApplied: true, message: 'Migrations already applied' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating tables...');

    // Create providers table
    await sql`
      CREATE TABLE IF NOT EXISTS providers (
        id SERIAL PRIMARY KEY,
        provider_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        base_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create requirement_catalog table
    await sql`
      CREATE TABLE IF NOT EXISTS requirement_catalog (
        id SERIAL PRIMARY KEY,
        req_code TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        category TEXT,
        credits_earned INTEGER DEFAULT 0,
        credits_required INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create partner_policies table
    await sql`
      CREATE TABLE IF NOT EXISTS partner_policies (
        id SERIAL PRIMARY KEY,
        school_code TEXT UNIQUE NOT NULL,
        school_name TEXT NOT NULL,
        max_alt_credits INTEGER DEFAULT 90,
        residency_required INTEGER DEFAULT 30,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create credit_transfer_rules table
    await sql`
      CREATE TABLE IF NOT EXISTS credit_transfer_rules (
        id SERIAL PRIMARY KEY,
        provider_code TEXT NOT NULL REFERENCES providers(provider_code),
        req_code TEXT NOT NULL REFERENCES requirement_catalog(req_code),
        course_id TEXT NOT NULL,
        course_title TEXT NOT NULL,
        credits INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(provider_code, course_id, req_code)
      )
    `;

    // Create option_exclusions table
    await sql`
      CREATE TABLE IF NOT EXISTS option_exclusions (
        id SERIAL PRIMARY KEY,
        req_code TEXT NOT NULL REFERENCES requirement_catalog(req_code),
        course_id TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(req_code, course_id)
      )
    `;

    await sql.end();

    console.log('✅ Migration complete');
    return new Response(
      JSON.stringify({ success: true, message: 'Database migrations applied successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
