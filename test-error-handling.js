// Test script to verify error handling in Career Switch functionality
console.log('🔧 Testing Career Switch Error Handling...');

// Get the current URL to determine project ID
const currentURL = window.location.href;
const projectId = currentURL.includes('sandbox.lovable.dev') ? 
  currentURL.split('.')[0].split('//')[1] : 'vzpissitddpunkpythsb';

const baseURL = `https://${projectId}.functions.supabase.co`;
const devUserId = '2b458624-d498-4cca-a63d-9341cc20e363'; // Aisha Khan

console.log('📍 Project ID:', projectId);
console.log('🔗 Base URL:', baseURL);

// Test functions
async function testCareerSwitchErrors() {
  console.log('\n🧪 Testing Career Switch Errors...');
  
  // Test 1: Empty track IDs (should return 400)
  console.log('\n1️⃣ Testing empty track IDs (expecting 400)...');
  try {
    const response = await fetch(`${baseURL}/calculate-career-switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': devUserId
      },
      body: JSON.stringify({
        fromTrackId: '',
        toTrackId: ''
      })
    });
    
    console.log('📊 Status:', response.status);
    const data = await response.json();
    console.log('📦 Response:', data);
    
    if (response.status === 400 && data.error === 'bad_request') {
      console.log('✅ Empty track IDs test PASSED');
    } else {
      console.log('❌ Empty track IDs test FAILED');
    }
  } catch (error) {
    console.log('❌ Empty track IDs test ERROR:', error);
  }
  
  // Test 2: Valid track IDs (should return 200)
  console.log('\n2️⃣ Testing valid track IDs (expecting 200)...');
  try {
    const response = await fetch(`${baseURL}/calculate-career-switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': devUserId
      },
      body: JSON.stringify({
        fromTrackId: 'e728ea1b-aeac-431a-b223-4315a7044fa5',
        toTrackId: '11487b59-02ea-4a26-ae30-f6ac586d54e0'
      })
    });
    
    console.log('📊 Status:', response.status);
    const data = await response.json();
    console.log('📦 Response keys:', Object.keys(data));
    
    if (response.status === 200) {
      console.log('✅ Valid track IDs test PASSED');
    } else {
      console.log('❌ Valid track IDs test FAILED');
      console.log('📦 Full response:', data);
    }
  } catch (error) {
    console.log('❌ Valid track IDs test ERROR:', error);
  }
  
  // Test 3: Invalid track ID (should return 404)
  console.log('\n3️⃣ Testing invalid track ID (expecting 404)...');
  try {
    const response = await fetch(`${baseURL}/calculate-career-switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': devUserId
      },
      body: JSON.stringify({
        fromTrackId: 'invalid-track-id-12345',
        toTrackId: '11487b59-02ea-4a26-ae30-f6ac586d54e0'
      })
    });
    
    console.log('📊 Status:', response.status);
    const data = await response.json();
    console.log('📦 Response:', data);
    
    if (response.status === 404 && data.error === 'not_found') {
      console.log('✅ Invalid track ID test PASSED');
    } else {
      console.log('❌ Invalid track ID test FAILED');
    }
  } catch (error) {
    console.log('❌ Invalid track ID test ERROR:', error);
  }
}

async function testLocationOptimizerErrors() {
  console.log('\n🧪 Testing Location Optimizer Errors...');
  
  // Test 1: Empty track IDs (should return 400)
  console.log('\n1️⃣ Testing empty track IDs (expecting 400)...');
  try {
    const response = await fetch(`${baseURL}/location-switch-optimizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': devUserId
      },
      body: JSON.stringify({
        fromTrackId: '',
        toTrackId: ''
      })
    });
    
    console.log('📊 Status:', response.status);
    const data = await response.json();
    console.log('📦 Response:', data);
    
    if (response.status === 400 && data.error === 'bad_request') {
      console.log('✅ Empty track IDs test PASSED');
    } else {
      console.log('❌ Empty track IDs test FAILED');
    }
  } catch (error) {
    console.log('❌ Empty track IDs test ERROR:', error);
  }
  
  // Test 2: Valid track IDs (should return 200)
  console.log('\n2️⃣ Testing valid track IDs (expecting 200)...');
  try {
    const response = await fetch(`${baseURL}/location-switch-optimizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': devUserId
      },
      body: JSON.stringify({
        fromTrackId: 'e728ea1b-aeac-431a-b223-4315a7044fa5',
        toTrackId: '11487b59-02ea-4a26-ae30-f6ac586d54e0',
        topN: 5
      })
    });
    
    console.log('📊 Status:', response.status);
    const data = await response.json();
    console.log('📦 Response keys:', Object.keys(data));
    
    if (response.status === 200) {
      console.log('✅ Valid track IDs test PASSED');
    } else {
      console.log('❌ Valid track IDs test FAILED');
      console.log('📦 Full response:', data);
    }
  } catch (error) {
    console.log('❌ Valid track IDs test ERROR:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testCareerSwitchErrors();
  await testLocationOptimizerErrors();
  console.log('\n🎉 All tests completed!');
}

// Execute the tests
runAllTests().catch(console.error);

// Also test UI error handling by manually triggering errors in the app
console.log('\n🎨 UI Error Testing Instructions:');
console.log('1. Navigate to /plan page');
console.log('2. Go to Career Switch Analyzer tab');
console.log('3. Select tracks and click "Update Analysis"');
console.log('4. Check console for error logs and UI error messages');