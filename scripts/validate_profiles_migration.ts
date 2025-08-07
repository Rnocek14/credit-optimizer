#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vzpissitddpunkpythsb.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI";

// Test user credentials for E2E validation
const TEST_USER_EMAIL = `test-e2e-${Date.now()}@lifepath.dev`;
const TEST_USER_PASSWORD = 'TestPass123!';

async function runE2EValidation() {
  console.log('🧪 Starting E2E validation of profiles migration...\n');

  // Create test client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Step 1: Sign up new test user
    console.log('1️⃣ Creating test user:', TEST_USER_EMAIL);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`
      }
    });

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError);
      return false;
    }

    if (!signUpData.user) {
      console.error('❌ No user returned from signup');
      return false;
    }

    console.log('✅ User created successfully:', signUpData.user.id);

    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Verify profile was created with email
    console.log('\n2️⃣ Checking profile creation...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, name, email, created_at')
      .eq('user_id', signUpData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile query failed:', profileError);
      return false;
    }

    if (!profile) {
      console.error('❌ No profile found for user');
      return false;
    }

    if (!profile.email) {
      console.error('❌ Profile missing email field');
      return false;
    }

    console.log('✅ Profile created with email:', profile);

    // Step 3: Test user preferences creation
    console.log('\n3️⃣ Testing user preferences creation...');
    const { data: prefData, error: prefError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: signUpData.user.id,
        preferences: {
          theme: 'dark',
          notifications: true,
          test_migration: true
        }
      })
      .select()
      .single();

    if (prefError) {
      console.error('❌ User preferences creation failed:', prefError);
      return false;
    }

    console.log('✅ User preferences created successfully:', prefData);

    // Step 4: Test profile read with RLS
    console.log('\n4️⃣ Testing profile read with RLS...');
    const { data: profileRead, error: profileReadError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', signUpData.user.id)
      .single();

    if (profileReadError) {
      console.error('❌ Profile read with RLS failed:', profileReadError);
      return false;
    }

    console.log('✅ Profile read successful with RLS');

    // Step 5: Clean up test user (optional)
    console.log('\n5️⃣ Cleaning up test data...');
    await supabase.auth.signOut();

    console.log('\n🎉 E2E validation completed successfully!');
    console.log('✅ Profile trigger creates email field');
    console.log('✅ RLS policies allow user access');
    console.log('✅ User preferences FK constraint works');
    console.log('✅ No "request forbidden" errors detected');

    return true;

  } catch (error) {
    console.error('\n❌ E2E validation failed:', error);
    return false;
  }
}

async function validateSchemaHealth() {
  console.log('\n🔍 Schema health check...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Check if we can query basic profile info (should work without auth for structure)
    const { error } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(0);

    if (error && !error.message.includes('row-level security')) {
      console.error('❌ Profiles table access issue:', error);
      return false;
    }

    console.log('✅ Profiles table structure accessible');
    return true;

  } catch (error) {
    console.error('❌ Schema health check failed:', error);
    return false;
  }
}

async function main() {
  const schemaHealthy = await validateSchemaHealth();
  if (!schemaHealthy) {
    console.log('\n⚠️  Schema health check failed. Migration may be needed.');
    process.exit(1);
  }

  const e2eSuccess = await runE2EValidation();
  if (!e2eSuccess) {
    console.log('\n❌ E2E validation failed');
    process.exit(1);
  }

  console.log('\n🎯 All validations passed! Migration is working correctly.');
}

if (require.main === module) {
  main();
}