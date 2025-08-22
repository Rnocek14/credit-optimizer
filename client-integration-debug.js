// ============================================
// CLIENT INTEGRATION DEBUG SCRIPT
// Enhanced client-side debugging for hooks
// ============================================

console.log('🔍 Client Integration Debug Script Loaded');

// Enhanced logging for edge function client
const originalInvoke = window.supabase?.functions?.invoke;
if (originalInvoke) {
  window.supabase.functions.invoke = function(functionName, options) {
    const debugId = Math.random().toString(36).substr(2, 9);
    
    console.group(`🚀 [${debugId}] Edge Function Call: ${functionName}`);
    console.log('📤 Options:', options);
    console.log('📤 Headers:', options?.headers);
    console.log('📤 Body:', options?.body);
    console.log('📤 Body type:', typeof options?.body);
    console.log('📤 Body JSON:', JSON.stringify(options?.body));
    
    const startTime = Date.now();
    
    return originalInvoke.call(this, functionName, options).then(result => {
      const duration = Date.now() - startTime;
      
      console.log('📥 Duration:', `${duration}ms`);
      console.log('📥 Success:', !result.error);
      
      if (result.error) {
        console.error('📥 Error details:', {
          message: result.error.message,
          status: result.error.status,
          statusText: result.error.statusText,
          context: result.error.context
        });
      } else {
        console.log('📥 Data keys:', result.data ? Object.keys(result.data) : 'null');
        console.log('📥 Data sample:', result.data);
      }
      
      console.groupEnd();
      return result;
    }).catch(error => {
      const duration = Date.now() - startTime;
      
      console.error('📥 Duration:', `${duration}ms`);
      console.error('📥 Network Error:', error);
      console.groupEnd();
      throw error;
    });
  };
  
  console.log('✅ Enhanced edge function logging enabled');
}

// Hook debugging utilities
window.debugHooks = {
  // Monitor switching engine hook
  monitorSwitchingEngine: (params) => {
    console.group('🔧 Switching Engine Debug');
    console.log('Input params:', params);
    
    // Validate params
    const validation = {
      hasFromTrackId: !!params?.fromTrackId,
      hasToTrackId: !!params?.toTrackId,
      fromTrackIdValid: params?.fromTrackId && params.fromTrackId.length > 0,
      toTrackIdValid: params?.toTrackId && params.toTrackId.length > 0,
      tracksAreDifferent: params?.fromTrackId !== params?.toTrackId,
      locationId: params?.locationId,
      userAge: params?.userAge
    };
    
    console.log('Validation:', validation);
    console.log('Should trigger query:', validation.hasFromTrackId && validation.hasToTrackId && validation.tracksAreDifferent);
    console.groupEnd();
    
    return validation;
  },
  
  // Monitor location optimizer hook
  monitorLocationOptimizer: (params) => {
    console.group('🗺️ Location Optimizer Debug');
    console.log('Input params:', params);
    
    const validation = {
      hasFromTrackId: !!params?.fromTrackId,
      hasToTrackId: !!params?.toTrackId,
      fromTrackIdValid: params?.fromTrackId && params.fromTrackId.length > 0,
      toTrackIdValid: params?.toTrackId && params.toTrackId.length > 0,
      tracksAreDifferent: params?.fromTrackId !== params?.toTrackId,
      topN: params?.topN || 5
    };
    
    console.log('Validation:', validation);
    console.log('Should trigger query:', validation.hasFromTrackId && validation.hasToTrackId && validation.tracksAreDifferent);
    console.groupEnd();
    
    return validation;
  },
  
  // Test direct function calls
  testDirectCall: async (functionName, payload) => {
    console.group(`🎯 Direct Function Test: ${functionName}`);
    console.log('Payload:', payload);
    
    try {
      const result = await window.supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': '2b458624-d498-4cca-a63d-9341cc20e363' // Aisha Khan
        }
      });
      
      console.log('Result:', result);
      console.groupEnd();
      return result;
      
    } catch (error) {
      console.error('Direct call error:', error);
      console.groupEnd();
      throw error;
    }
  },
  
  // Test error scenarios
  testErrorScenarios: async () => {
    console.group('🚨 Error Scenario Tests');
    
    const tests = [
      {
        name: 'Empty payload',
        function: 'calculate-career-switch',
        payload: {}
      },
      {
        name: 'Missing toTrackId',
        function: 'calculate-career-switch', 
        payload: { fromTrackId: 'e728ea1b-aeac-431a-b223-4315a7044fa5' }
      },
      {
        name: 'Invalid track IDs',
        function: 'calculate-career-switch',
        payload: { 
          fromTrackId: '00000000-0000-0000-0000-000000000000',
          toTrackId: '11111111-1111-1111-1111-111111111111'
        }
      }
    ];
    
    for (const test of tests) {
      console.log(`\n🧪 Test: ${test.name}`);
      try {
        const result = await window.debugHooks.testDirectCall(test.function, test.payload);
        console.log(`Result:`, result);
      } catch (error) {
        console.error(`Error:`, error);
      }
    }
    
    console.groupEnd();
  },
  
  // Test success scenarios
  testSuccessScenarios: async () => {
    console.group('✅ Success Scenario Tests');
    
    const tests = [
      {
        name: 'Career Switch Success',
        function: 'calculate-career-switch',
        payload: {
          fromTrackId: 'e728ea1b-aeac-431a-b223-4315a7044fa5',
          toTrackId: '11487b59-02ea-4a26-ae30-f6ac586d54e0',
          locationId: 'US-NYC'
        }
      },
      {
        name: 'Location Optimizer Success',
        function: 'location-switch-optimizer',
        payload: {
          fromTrackId: 'e728ea1b-aeac-431a-b223-4315a7044fa5',
          toTrackId: '11487b59-02ea-4a26-ae30-f6ac586d54e0',
          topN: 5
        }
      }
    ];
    
    for (const test of tests) {
      console.log(`\n🧪 Test: ${test.name}`);
      try {
        const result = await window.debugHooks.testDirectCall(test.function, test.payload);
        console.log(`Success:`, result);
      } catch (error) {
        console.error(`Error:`, error);
      }
    }
    
    console.groupEnd();
  }
};

// Auto-monitor React Query devtools
const originalLog = console.log;
let queryLogs = [];

console.log = function(...args) {
  // Capture React Query logs
  const message = args.join(' ');
  if (message.includes('React Query') || message.includes('[Switch]') || message.includes('[Opt]')) {
    queryLogs.push({ timestamp: new Date().toISOString(), message });
    
    // Keep only last 50 logs
    if (queryLogs.length > 50) {
      queryLogs = queryLogs.slice(-50);  
    }
  }
  
  return originalLog.apply(console, args);
};

// Utility functions
window.debugUtils = {
  // Get recent query logs
  getQueryLogs: () => queryLogs,
  
  // Clear query logs
  clearQueryLogs: () => { queryLogs = []; },
  
  // Monitor component renders
  trackRenders: (componentName) => {
    return {
      enter: (props) => console.log(`🔄 ${componentName} render START`, props),
      exit: (state) => console.log(`🔄 ${componentName} render END`, state)
    };
  },
  
  // Network monitoring helper
  monitorNetwork: () => {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (url.includes('functions.supabase.co')) {
        console.group(`🌐 Network Call: ${url}`);
        console.log('Options:', options);
        const startTime = Date.now();
        
        return originalFetch.apply(this, arguments).then(response => {
          const duration = Date.now() - startTime;
          console.log(`Response: ${response.status} ${response.statusText} (${duration}ms)`);
          console.log('Headers:', Object.fromEntries([...response.headers.entries()]));
          console.groupEnd();
          return response;
        }).catch(error => {
          const duration = Date.now() - startTime;
          console.error(`Network Error: ${error.message} (${duration}ms)`);
          console.groupEnd();
          throw error;
        });
      }
      
      return originalFetch.apply(this, arguments);
    };
    
    console.log('✅ Network monitoring enabled');
  }
};

console.log('💡 Available debug commands:');
console.log('  debugHooks.monitorSwitchingEngine(params)');
console.log('  debugHooks.monitorLocationOptimizer(params)');
console.log('  debugHooks.testDirectCall(functionName, payload)');
console.log('  debugHooks.testErrorScenarios()');
console.log('  debugHooks.testSuccessScenarios()');
console.log('  debugUtils.getQueryLogs()');
console.log('  debugUtils.clearQueryLogs()');
console.log('  debugUtils.monitorNetwork()');
