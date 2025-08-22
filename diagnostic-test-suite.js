// ============================================
// COMPREHENSIVE DIAGNOSTIC TEST SUITE
// Career Switch & Location Optimizer Debug
// ============================================

const PROJECT_ID = 'vzpissitddpunkpythsb';
const BASE_URL = `https://${PROJECT_ID}.functions.supabase.co`;
const DEV_USER_ID = '2b458624-d498-4cca-a63d-9341cc20e363'; // Aisha Khan

// Test track IDs from the database
const FROM_TRACK_ID = 'e728ea1b-aeac-431a-b223-4315a7044fa5';
const TO_TRACK_ID = '11487b59-02ea-4a26-ae30-f6ac586d54e0';

console.log('🔧 Starting Career Switch & Location Optimizer Diagnostics');
console.log('=' .repeat(60));

// ============================================
// PHASE 1: NETWORK LAYER VERIFICATION
// ============================================

async function testNetworkLayer() {
  console.log('\n📡 PHASE 1: Network Layer Verification');
  console.log('-'.repeat(40));

  // Test function URLs
  const functions = ['calculate-career-switch', 'location-switch-optimizer'];
  
  for (const funcName of functions) {
    const url = `${BASE_URL}/${funcName}`;
    console.log(`\n🔗 Testing: ${url}`);
    
    try {
      // Test OPTIONS preflight
      console.log('  ⚡ Testing CORS preflight (OPTIONS)...');
      const optionsResponse = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type, x-dev-user-id'
        }
      });
      
      console.log(`     Status: ${optionsResponse.status}`);
      console.log(`     CORS Headers:`, {
        'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers')
      });
      
    } catch (error) {
      console.error(`  ❌ CORS preflight failed:`, error.message);
    }
  }
}

// ============================================
// PHASE 2: FUNCTION LOGIC TESTING
// ============================================

async function testPingEndpoints() {
  console.log('\n🏓 PHASE 2A: Ping Endpoint Tests');
  console.log('-'.repeat(40));

  const functions = ['calculate-career-switch', 'location-switch-optimizer'];
  
  for (const funcName of functions) {
    console.log(`\n🎯 Testing ${funcName} ping...`);
    
    try {
      const response = await fetch(`${BASE_URL}/${funcName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': DEV_USER_ID
        },
        body: JSON.stringify({ action: 'ping' })
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Response:`, data);
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Error Response:`, errorText);
      }
      
    } catch (error) {
      console.error(`  ❌ Network error:`, error.message);
    }
  }
}

async function test400Responses() {
  console.log('\n🚫 PHASE 2B: Testing 400 Bad Request Responses');
  console.log('-'.repeat(40));

  const testCases = [
    {
      name: 'Empty payload',
      payload: {}
    },
    {
      name: 'Missing fromTrackId',
      payload: { toTrackId: TO_TRACK_ID }
    },
    {
      name: 'Missing toTrackId', 
      payload: { fromTrackId: FROM_TRACK_ID }
    },
    {
      name: 'Empty string IDs',
      payload: { fromTrackId: '', toTrackId: '' }
    }
  ];

  const functions = ['calculate-career-switch', 'location-switch-optimizer'];
  
  for (const funcName of functions) {
    console.log(`\n🎯 Testing ${funcName} 400 responses...`);
    
    for (const testCase of testCases) {
      console.log(`  📝 Test: ${testCase.name}`);
      
      try {
        const response = await fetch(`${BASE_URL}/${funcName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user-id': DEV_USER_ID
          },
          body: JSON.stringify(testCase.payload)
        });
        
        console.log(`     Status: ${response.status}`);
        
        if (response.status === 400) {
          const errorData = await response.json();
          console.log(`     ✅ Expected 400:`, errorData);
        } else {
          const responseText = await response.text();
          console.log(`     ⚠️  Unexpected status: ${response.status}`, responseText);
        }
        
      } catch (error) {
        console.error(`     ❌ Error:`, error.message);
      }
    }
  }
}

async function test200Responses() {
  console.log('\n✅ PHASE 2C: Testing 200 Success Responses');
  console.log('-'.repeat(40));

  const testCases = [
    {
      func: 'calculate-career-switch',
      payload: {
        fromTrackId: FROM_TRACK_ID,
        toTrackId: TO_TRACK_ID,
        locationId: 'US-NYC'
      }
    },
    {
      func: 'location-switch-optimizer', 
      payload: {
        fromTrackId: FROM_TRACK_ID,
        toTrackId: TO_TRACK_ID,
        topN: 5
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🎯 Testing ${testCase.func} success...`);
    console.log(`  📤 Payload:`, testCase.payload);
    
    try {
      const response = await fetch(`${BASE_URL}/${testCase.func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': DEV_USER_ID
        },
        body: JSON.stringify(testCase.payload)
      });
      
      console.log(`  📥 Status: ${response.status}`);
      console.log(`  📥 Headers:`, Object.fromEntries([...response.headers.entries()]));
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Response keys:`, Object.keys(data));
        console.log(`  ✅ Sample data:`, data);
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Error response:`, errorText);
      }
      
    } catch (error) {
      console.error(`  ❌ Network error:`, error.message);
    }
  }
}

// ============================================
// PHASE 3: CLIENT INTEGRATION TESTING  
// ============================================

async function testSupabaseClientInvocation() {
  console.log('\n🔗 PHASE 3: Client Integration Testing');
  console.log('-'.repeat(40));

  // Import supabase client if available
  let supabase;
  try {
    const supabaseModule = await import('/src/integrations/supabase/client.js');
    supabase = supabaseModule.supabase;
    console.log('✅ Supabase client loaded');
  } catch (error) {
    console.error('❌ Could not load Supabase client:', error.message);
    return;
  }

  const testCases = [
    {
      func: 'calculate-career-switch',
      payload: {
        fromTrackId: FROM_TRACK_ID,
        toTrackId: TO_TRACK_ID,
        locationId: 'US-NYC'
      }
    },
    {
      func: 'location-switch-optimizer',
      payload: {
        fromTrackId: FROM_TRACK_ID,
        toTrackId: TO_TRACK_ID,
        topN: 3
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🎯 Testing Supabase client invoke: ${testCase.func}`);
    console.log(`  📤 Payload:`, testCase.payload);
    
    try {
      const { data, error } = await supabase.functions.invoke(testCase.func, {
        body: testCase.payload,
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': DEV_USER_ID
        }
      });
      
      if (error) {
        console.log(`  ❌ Supabase client error:`, error);
        console.log(`  📊 Error details:`, {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          context: error.context
        });
      } else {
        console.log(`  ✅ Supabase client success`);
        console.log(`  📥 Response keys:`, Object.keys(data || {}));
        console.log(`  📊 Sample data:`, data);
      }
      
    } catch (error) {
      console.error(`  ❌ Client invocation error:`, error.message);
    }
  }
}

// ============================================
// PHASE 4: SCHEMA VALIDATION TESTING
// ============================================

async function testSchemaValidation() {
  console.log('\n📋 PHASE 4: Schema Validation Testing');
  console.log('-'.repeat(40));

  // Test actual function responses against expected schemas
  const functions = [
    {
      name: 'calculate-career-switch',
      expectedKeys: ['switchId', 'metrics', 'tracks'],
      requiredMetrics: ['skillOverlap', 'transferCredit', 'timeGained', 'timeLost', 'switchCost', 'roi3yr', 'breakEvenMonths', 'criDelta']
    },
    {
      name: 'location-switch-optimizer',
      expectedKeys: ['fromTrack', 'toTrack', 'rankedLocations', 'assumptions'],
      requiredLocationKeys: ['city', 'country', 'currentSalary', 'targetSalary', 'costOfLiving', 'netIncome', 'lqi']
    }
  ];

  for (const funcTest of functions) {
    console.log(`\n🎯 Schema validation: ${funcTest.name}`);
    
    try {
      const payload = {
        fromTrackId: FROM_TRACK_ID,
        toTrackId: TO_TRACK_ID,
        ...(funcTest.name.includes('location') ? { topN: 3 } : { locationId: 'US-NYC' })
      };
      
      const response = await fetch(`${BASE_URL}/${funcTest.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': DEV_USER_ID
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  📥 Response keys:`, Object.keys(data));
        
        // Check required top-level keys
        const missingKeys = funcTest.expectedKeys.filter(key => !(key in data));
        if (missingKeys.length === 0) {
          console.log(`  ✅ All expected keys present`);
        } else {
          console.log(`  ⚠️  Missing keys:`, missingKeys);
        }
        
        // Additional validation for specific functions
        if (funcTest.name === 'calculate-career-switch' && data.metrics) {
          const missingMetrics = funcTest.requiredMetrics.filter(key => !(key in data.metrics));
          if (missingMetrics.length === 0) {
            console.log(`  ✅ All metric fields present`);
          } else {
            console.log(`  ⚠️  Missing metric fields:`, missingMetrics);
          }
        }
        
        if (funcTest.name === 'location-switch-optimizer' && data.rankedLocations) {
          if (Array.isArray(data.rankedLocations) && data.rankedLocations.length > 0) {
            const firstLocation = data.rankedLocations[0];
            const missingLocationKeys = funcTest.requiredLocationKeys.filter(key => !(key in firstLocation));
            if (missingLocationKeys.length === 0) {
              console.log(`  ✅ All location fields present`);
            } else {
              console.log(`  ⚠️  Missing location fields:`, missingLocationKeys);
            }
          }
        }
        
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Response error: ${response.status}`, errorText);
      }
      
    } catch (error) {
      console.error(`  ❌ Schema test error:`, error.message);
    }
  }
}

// ============================================
// DIAGNOSTIC EXECUTION
// ============================================

async function runFullDiagnostics() {
  console.log('🚀 Starting Full Diagnostic Suite...');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Project:', PROJECT_ID);
  console.log('Dev User:', DEV_USER_ID);
  console.log('Test Tracks:', FROM_TRACK_ID, '->', TO_TRACK_ID);
  
  try {
    await testNetworkLayer();
    await testPingEndpoints();
    await test400Responses();
    await test200Responses();
    await testSupabaseClientInvocation();
    await testSchemaValidation();
    
    console.log('\n🎉 DIAGNOSTIC SUITE COMPLETED');
    console.log('=' .repeat(60));
    console.log('Check the console output above for detailed results');
    
  } catch (error) {
    console.error('❌ Diagnostic suite error:', error);
  }
}

// Auto-run diagnostics when script loads
runFullDiagnostics();

// Export for manual testing
window.diagnostics = {
  runFullDiagnostics,
  testNetworkLayer,
  testPingEndpoints,
  test400Responses,
  test200Responses,
  testSupabaseClientInvocation,
  testSchemaValidation
};

console.log('💡 Available commands:');
console.log('  diagnostics.runFullDiagnostics() - Run all tests');
console.log('  diagnostics.testNetworkLayer() - Test CORS and reachability');
console.log('  diagnostics.testPingEndpoints() - Test ping endpoints');
console.log('  diagnostics.test400Responses() - Test error handling');
console.log('  diagnostics.test200Responses() - Test success cases');
console.log('  diagnostics.testSupabaseClientInvocation() - Test client integration');
console.log('  diagnostics.testSchemaValidation() - Test response schemas');