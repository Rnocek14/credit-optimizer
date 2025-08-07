#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vzpissitddpunkpythsb.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI";

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

async function checkTableStructure(): Promise<HealthCheck> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // This should fail with RLS error if table exists and is properly secured
    const { error } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .limit(1);

    // We expect RLS error for unauthenticated access
    if (error && error.message.includes('row-level security')) {
      return {
        name: 'Table Structure & RLS',
        status: 'pass',
        message: 'Profiles table exists with proper RLS protection',
        details: { expectedRLSError: true }
      };
    }

    // If no error, table might not have RLS enabled
    if (!error) {
      return {
        name: 'Table Structure & RLS',
        status: 'warning',
        message: 'Profiles table accessible without authentication - RLS may not be enabled',
        details: { expectedRLSError: false }
      };
    }

    // Other errors indicate structural issues
    return {
      name: 'Table Structure & RLS',
      status: 'fail',
      message: `Unexpected error: ${error.message}`,
      details: error
    };

  } catch (error) {
    return {
      name: 'Table Structure & RLS',
      status: 'fail',
      message: `Connection or structural error: ${error}`,
      details: error
    };
  }
}

async function checkTriggerPresence(): Promise<HealthCheck> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Try to create a test user to see if trigger fires
    // This is a read-only check, so we can't actually test trigger execution
    // Instead, we'll just verify the function exists
    const { error } = await supabase.rpc('handle_new_user');
    
    // We expect an error since we're not calling it properly, 
    // but if function exists, error should be about parameters, not "function does not exist"
    if (error && !error.message.includes('does not exist')) {
      return {
        name: 'Trigger Function',
        status: 'pass',
        message: 'handle_new_user function exists',
        details: { functionExists: true }
      };
    }

    if (error && error.message.includes('does not exist')) {
      return {
        name: 'Trigger Function',
        status: 'fail',
        message: 'handle_new_user function does not exist',
        details: error
      };
    }

    return {
      name: 'Trigger Function',
      status: 'warning',
      message: 'Could not verify trigger function existence',
      details: error
    };

  } catch (error) {
    return {
      name: 'Trigger Function',
      status: 'fail',
      message: `Error checking trigger function: ${error}`,
      details: error
    };
  }
}

async function checkSupabaseConnection(): Promise<HealthCheck> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Simple ping to verify connection
    const { data, error } = await supabase.from('profiles').select('count').limit(0);
    
    if (error && error.message.includes('relation "profiles" does not exist')) {
      return {
        name: 'Supabase Connection',
        status: 'fail',
        message: 'Profiles table does not exist',
        details: error
      };
    }

    // Any other response (including RLS errors) means connection is working
    return {
      name: 'Supabase Connection',
      status: 'pass',
      message: 'Successfully connected to Supabase',
      details: { connected: true }
    };

  } catch (error) {
    return {
      name: 'Supabase Connection',
      status: 'fail',
      message: `Connection failed: ${error}`,
      details: error
    };
  }
}

async function runHealthChecks(): Promise<HealthCheck[]> {
  console.log('🏥 Running profiles migration health checks...\n');
  
  const checks = await Promise.all([
    checkSupabaseConnection(),
    checkTableStructure(),
    checkTriggerPresence()
  ]);

  return checks;
}

function printHealthReport(checks: HealthCheck[]) {
  console.log('📊 Health Check Report\n');
  
  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : 
                 check.status === 'warning' ? '⚠️' : '❌';
    
    console.log(`${icon} ${check.name}: ${check.message}`);
    
    if (check.details && Object.keys(check.details).length > 0) {
      console.log(`   Details: ${JSON.stringify(check.details, null, 2)}`);
    }
    
    switch (check.status) {
      case 'pass': passCount++; break;
      case 'fail': failCount++; break;
      case 'warning': warningCount++; break;
    }
    
    console.log('');
  });

  console.log(`📈 Summary: ${passCount} passed, ${warningCount} warnings, ${failCount} failed\n`);

  if (failCount > 0) {
    console.log('❌ Health check failed. Consider running the migration script:');
    console.log('   npm run migrate:profiles-email\n');
    return false;
  }

  if (warningCount > 0) {
    console.log('⚠️  Health check passed with warnings. Monitor closely.\n');
  } else {
    console.log('🎉 All health checks passed! Profiles migration is healthy.\n');
  }

  return true;
}

async function main() {
  const checks = await runHealthChecks();
  const healthy = printHealthReport(checks);
  
  process.exit(healthy ? 0 : 1);
}

if (require.main === module) {
  main();
}

export { runHealthChecks, printHealthReport };
