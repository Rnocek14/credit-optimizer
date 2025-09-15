// Skill Tree Debug Utilities
// These functions help troubleshoot and fix skill tree rendering issues

export const skillTreeDebug = {
  // Enable stability mode (forces grid layout)
  enableStabilityMode: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ST_STABILITY_MODE', '1');
      console.log('🔧 Stability mode enabled. Reload the page to use grid layout.');
    }
  },

  // Disable stability mode (allows enhanced layout)
  disableStabilityMode: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ST_STABILITY_MODE');
      localStorage.removeItem('ST_FORCE_GRID');
      console.log('✅ Stability mode disabled. Enhanced layout will be attempted.');
    }
  },

  // Enable test mode (shows single test node)
  enableTestMode: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ST_FORCE_TEST', '1');
      console.log('🧪 Test mode enabled. Single test node will render.');
    }
  },

  // Disable test mode
  disableTestMode: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ST_FORCE_TEST');
      console.log('✅ Test mode disabled.');
    }
  },

  // Get current debug status
  getStatus: () => {
    if (typeof window === 'undefined') return {};
    
    return {
      stabilityMode: localStorage.getItem('ST_STABILITY_MODE') === '1',
      forceGrid: localStorage.getItem('ST_FORCE_GRID') === '1',
      testMode: localStorage.getItem('ST_FORCE_TEST') === '1',
    };
  },

  // Clear all debug flags
  clearAll: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ST_STABILITY_MODE');
      localStorage.removeItem('ST_FORCE_GRID');
      localStorage.removeItem('ST_FORCE_TEST');
      console.log('🧹 All skill tree debug flags cleared.');
    }
  },

  // Print diagnostic info
  diagnose: () => {
    if (typeof window === 'undefined') return;

    const diag = (window as any).__skillTreeDiag;
    const status = skillTreeDebug.getStatus();
    
    console.log('🔍 Skill Tree Diagnostic Report:');
    console.log('Debug Flags:', status);
    if (diag) {
      console.log('Runtime Data:', diag);
    } else {
      console.log('No runtime diagnostic data available');
    }
  }
};

// Make debug utilities available globally in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).skillTreeDebug = skillTreeDebug;
  console.log('🛠️ Skill tree debug utilities available: window.skillTreeDebug');
}