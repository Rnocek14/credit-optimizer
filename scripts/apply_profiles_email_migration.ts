#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vzpissitddpunkpythsb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runQuery(description: string, query: string) {
  console.log(`🔄 ${description}...`);
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error) {
    console.error(`❌ ${description} failed:`, error);
    throw error;
  }
  
  console.log(`✅ ${description} completed`);
  return data;
}

async function logSchemaState(label: string) {
  console.log(`\n📊 ${label}:`);
  
  // Check columns
  const { data: columns } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='profiles'
      ORDER BY ordinal_position;
    `
  });
  console.log('Profiles columns:', columns);

  // Check profiles with missing email
  const { data: missingEmail } = await supabase.rpc('exec_sql', {
    query: `
      SELECT count(*) as profiles_missing_email 
      FROM public.profiles 
      WHERE email IS NULL OR email = '';
    `
  });
  console.log('Profiles missing email:', missingEmail);

  // Check triggers
  const { data: triggers } = await supabase.rpc('exec_sql', {
    query: `
      SELECT tgname, tgenabled 
      FROM pg_trigger 
      WHERE tgrelid = 'auth.users'::regclass;
    `
  });
  console.log('Auth triggers:', triggers);

  // Check RLS policies
  const { data: policies } = await supabase.rpc('exec_sql', {
    query: `
      SELECT polname 
      FROM pg_policies 
      WHERE schemaname='public' AND tablename='profiles' 
      ORDER BY polname;
    `
  });
  console.log('RLS policies:', policies);
}

async function main() {
  console.log('🚀 Starting profiles email migration...\n');

  try {
    // Log before state
    await logSchemaState('BEFORE Migration');

    console.log('\n🔧 Executing migration SQL...');

    // Execute the idempotent migration in a single transaction
    const migrationSQL = `
      BEGIN;

      -- 0) Safety: ensure unique one-to-one mapping auth.users -> public.profiles by user_id
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'profiles_user_id_key'
        ) THEN
          ALTER TABLE public.profiles
          ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
        END IF;
      END$$;

      -- 1) Add email column if missing
      ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS email TEXT;

      -- 2) (Re)create the new-user provisioning function with email handling
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        INSERT INTO public.profiles (user_id, name, email)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email,'@',1)),
          NEW.email
        )
        ON CONFLICT (user_id) DO UPDATE
          SET name  = EXCLUDED.name,
              email = EXCLUDED.email;
        RETURN NEW;
      END;
      $$;

      -- 3) Ensure trigger is bound to auth.users
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

      -- 4) Backfill email for existing profiles (safe no-op if present)
      UPDATE public.profiles p
      SET email = u.email
      FROM auth.users u
      WHERE p.user_id = u.id
        AND (p.email IS NULL OR p.email = '');

      -- 5) RLS: enable + minimal "own row" policies (idempotent)
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'read own profile' AND schemaname='public' AND tablename='profiles') THEN
          DROP POLICY "read own profile" ON public.profiles;
        END IF;
        CREATE POLICY "read own profile"
        ON public.profiles FOR SELECT
        USING (user_id = auth.uid());

        IF EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'upsert own profile' AND schemaname='public' AND tablename='profiles') THEN
          DROP POLICY "upsert own profile" ON public.profiles;
        END IF;
        CREATE POLICY "upsert own profile"
        ON public.profiles FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
      END$$;

      -- 6) Ensure dependent FKs point at profiles.user_id (if user_preferences table exists)
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema='public' AND table_name='user_preferences'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_user_id_fkey'
          ) THEN
            ALTER TABLE public.user_preferences
            ADD CONSTRAINT user_preferences_user_id_fkey
              FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
              ON DELETE CASCADE;
          END IF;
        END IF;
      END$$;

      COMMIT;
    `;

    // Execute migration
    await runQuery('Migration SQL execution', migrationSQL);

    // Log after state
    await logSchemaState('AFTER Migration');

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test signup flow with a new user');
    console.log('2. Verify profiles table has email populated');
    console.log('3. Check that onboarding completes without errors');
    console.log('4. Run: npm run test:e2e to validate end-to-end flow');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n🔄 Attempting rollback...');
    
    try {
      await runQuery('Rollback', 'ROLLBACK;');
      console.log('✅ Rollback completed');
    } catch (rollbackError) {
      console.error('❌ Rollback also failed:', rollbackError);
    }
    
    process.exit(1);
  }
}

// Direct SQL execution function for admin operations
async function createExecSqlFunction() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result JSON;
        BEGIN
          EXECUTE query;
          GET DIAGNOSTICS result = ROW_COUNT;
          RETURN json_build_object('rows_affected', result);
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'SQL execution failed: %', SQLERRM;
        END;
        $$;
      `
    });
    
    if (error) {
      console.log('Note: exec_sql function may already exist or require different permissions');
    }
  } catch (e) {
    // Function might already exist or we might need to execute SQL differently
    console.log('Using alternative SQL execution method...');
  }
}

if (require.main === module) {
  createExecSqlFunction().then(() => main());
}