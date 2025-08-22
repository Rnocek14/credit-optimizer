// ============================================
// BROWSER DIAGNOSTIC RUNNER
// Execute diagnostics directly in browser
// ============================================

// Inject and run the main diagnostic suite
async function loadAndRunDiagnostics() {
  console.log('🔧 Loading Browser Diagnostic Suite...');
  
  try {
    // Load the main diagnostic script
    const script = document.createElement('script');
    script.src = '/diagnostic-test-suite.js';
    script.onload = () => {
      console.log('✅ Diagnostic suite loaded');
    };
    script.onerror = () => {
      console.error('❌ Failed to load diagnostic suite');
      // Fallback: run inline diagnostics
      runInlineDiagnostics();
    };
    document.head.appendChild(script);
    
    // Load client integration debug
    const debugScript = document.createElement('script');
    debugScript.src = '/client-integration-debug.js'; 
    debugScript.onload = () => {
      console.log('✅ Client debug script loaded');
    };
    document.head.appendChild(debugScript);
    
  } catch (error) {
    console.error('❌ Error loading diagnostic scripts:', error);
    runInlineDiagnostics();
  }
}

// Inline diagnostics fallback
async function runInlineDiagnostics() {
  console.log('🔧 Running Inline Browser Diagnostics');
  console.log('=' .repeat(50));
  
  const PROJECT_ID = 'vzpissitddpunkpythsb';
  const DEV_USER_ID = '2b458624-d498-4cca-a63d-9341cc20e363';
  const FROM_TRACK_ID = 'e728ea1b-aeac-431a-b223-4315a7044fa5';
  const TO_TRACK_ID = '11487b59-02ea-4a26-ae30-f6ac586d54e0';
  
  // Quick network test
  console.log('\n📡 Quick Network Test');
  console.log('-'.repeat(30));
  
  try {
    const response = await fetch(`https://${PROJECT_ID}.functions.supabase.co/calculate-career-switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': DEV_USER_ID
      },
      body: JSON.stringify({ action: 'ping' })
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response:', data);
    
  } catch (error) {
    console.error('Network test failed:', error);
  }
  
  // Test UI components if available
  if (typeof window.debugHooks !== 'undefined') {
    console.log('\n🔧 Testing UI Integration');
    console.log('-'.repeat(30));
    
    await window.debugHooks.testSuccessScenarios();
  }
  
  console.log('\n✅ Inline diagnostics completed');
}

// UI debugging helpers
function addDiagnosticUI() {
  // Create a floating diagnostic panel
  const panel = document.createElement('div');
  panel.id = 'diagnostic-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    max-height: 400px;
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    z-index: 10000;
    font-family: monospace;
    font-size: 12px;
    overflow-y: auto;
    display: none;
  `;
  
  panel.innerHTML = `
    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 12px;">
      <h3 style="margin: 0; color: #3b82f6;">🔧 Diagnostics</h3>
      <button onclick="document.getElementById('diagnostic-panel').style.display='none'" style="background: none; border: none; cursor: pointer; font-size: 16px;">×</button>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button onclick="window.diagnostics?.runFullDiagnostics()" style="padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Run Full Diagnostics
      </button>
      <button onclick="window.debugHooks?.testSuccessScenarios()" style="padding: 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Test Success Cases
      </button>
      <button onclick="window.debugHooks?.testErrorScenarios()" style="padding: 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Test Error Cases
      </button>
      <button onclick="window.debugUtils?.monitorNetwork()" style="padding: 8px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Monitor Network
      </button>
      <button onclick="console.table(window.debugUtils?.getQueryLogs())" style="padding: 8px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Show Query Logs
      </button>
    </div>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">
      <div>Project: ${PROJECT_ID}</div>
      <div>User: Aisha Khan</div>
      <div>Status: <span id="diagnostic-status">Ready</span></div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Add keyboard shortcut to show/hide panel
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      const panel = document.getElementById('diagnostic-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });
  
  console.log('✅ Diagnostic UI added (Ctrl+Shift+D to toggle)');
}

// Error monitoring
function addErrorMonitoring() {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const errors = [];
  const warnings = [];
  
  console.error = function(...args) {
    errors.push({ timestamp: new Date().toISOString(), args });
    
    // Keep only last 20 errors
    if (errors.length > 20) {
      errors.splice(0, errors.length - 20);
    }
    
    return originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    warnings.push({ timestamp: new Date().toISOString(), args });
    
    // Keep only last 20 warnings
    if (warnings.length > 20) {
      warnings.splice(0, warnings.length - 20);
    }
    
    return originalWarn.apply(console, args);
  };
  
  window.addEventListener('error', (e) => {
    errors.push({
      timestamp: new Date().toISOString(),
      type: 'unhandled',
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error
    });
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    errors.push({
      timestamp: new Date().toISOString(),
      type: 'unhandled_promise',
      reason: e.reason
    });
  });
  
  // Make available globally
  window.errorMonitor = {
    getErrors: () => errors,
    getWarnings: () => warnings,
    clearErrors: () => { errors.length = 0; },
    clearWarnings: () => { warnings.length = 0; }
  };
  
  console.log('✅ Error monitoring enabled');
}

// Initialize diagnostics when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      loadAndRunDiagnostics();
      addDiagnosticUI();
      addErrorMonitoring();
    }, 1000); // Wait for app to initialize
  });
} else {
  setTimeout(() => {
    loadAndRunDiagnostics();
    addDiagnosticUI();
    addErrorMonitoring();
  }, 1000);
}

console.log('🔧 Browser Diagnostic Runner Initialized');
console.log('💡 Use Ctrl+Shift+D to open diagnostic panel');
console.log('💡 Available: window.errorMonitor, window.debugHooks, window.debugUtils');
