// Direct test to isolate the body transmission issue
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = "https://vzpissitddpunkpythsb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI";

export async function testDirectEdgeCall() {
  console.log('🧪 Direct Edge Function Test Starting...');
  
  const payload = {
    fromTrackId: 'e728ea1b-aeac-431a-b223-4315a7044fa5',
    toTrackId: '11487b59-02ea-4a26-ae30-f6ac586d54e0',
    action: 'ping'
  };
  
  console.log('Original payload:', payload);
  console.log('Serialized payload:', JSON.stringify(payload));
  console.log('Payload size:', JSON.stringify(payload).length);
  
  try {
    // Test 1: Exactly as the client does it
    console.log('\n--- Test 1: Standard invoke ---');
    const { data: data1, error: error1 } = await supabase.functions.invoke('calculate-career-switch', {
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': '2b458624-d498-4cca-a63d-9341cc20e363'
      }
    });
    console.log('Result 1:', { data: data1, error: error1 });
    
    // Test 2: Pre-stringify the body
    console.log('\n--- Test 2: Pre-stringified body ---');
    const { data: data2, error: error2 } = await supabase.functions.invoke('calculate-career-switch', {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': '2b458624-d498-4cca-a63d-9341cc20e363'
      }
    });
    console.log('Result 2:', { data: data2, error: error2 });
    
    // Test 3: Fetch directly to the edge function URL
    console.log('\n--- Test 3: Direct fetch ---');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-career-switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'x-dev-user-id': '2b458624-d498-4cca-a63d-9341cc20e363'
      },
      body: JSON.stringify(payload)
    });
    
    const result3 = await response.json();
    console.log('Result 3:', { status: response.status, data: result3 });
    
  } catch (err) {
    console.error('Direct test failed:', err);
  }
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testDirectEdgeCall = testDirectEdgeCall;
  console.log('🧪 Direct test available - run with: testDirectEdgeCall()');
}