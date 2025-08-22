// Lightweight edge function diagnostics for browser console
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details: any;
  duration: number;
}

interface DiagnosticSuite {
  runPingTests(): Promise<DiagnosticResult[]>;
  runErrorTests(): Promise<DiagnosticResult[]>;
  runSuccessTests(): Promise<DiagnosticResult[]>;
  runFullDiagnostics(): Promise<void>;
}

class EdgeDiagnostics implements DiagnosticSuite {
  private readonly DEV_USER_ID = '2b458624-d498-4cca-a63d-9341cc20e363';
  private readonly FUNCTIONS = ['calculate-career-switch', 'location-switch-optimizer'];
  
  private async callFunction(name: string, payload: any): Promise<DiagnosticResult> {
    const start = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke(name, {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': this.DEV_USER_ID
        }
      });
      
      const duration = performance.now() - start;
      
      if (error) {
        return {
          test: `${name}(${JSON.stringify(payload).slice(0, 50)}...)`,
          status: 'FAIL',
          details: { error: error.message, context: error },
          duration
        };
      }
      
      return {
        test: `${name}(${JSON.stringify(payload).slice(0, 50)}...)`,
        status: 'PASS',
        details: { 
          keys: data ? Object.keys(data) : [],
          hasData: !!data,
          dataPreview: data
        },
        duration
      };
    } catch (err) {
      return {
        test: `${name}(${JSON.stringify(payload).slice(0, 50)}...)`,
        status: 'FAIL',
        details: { error: err.message, stack: err.stack },
        duration: performance.now() - start
      };
    }
  }

  async runPingTests(): Promise<DiagnosticResult[]> {
    console.log('🏓 Running ping tests...');
    const results = await Promise.all(
      this.FUNCTIONS.map(fn => this.callFunction(fn, { action: 'ping' }))
    );
    results.forEach(r => console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${r.test} (${r.duration.toFixed(0)}ms)`));
    return results;
  }

  async runErrorTests(): Promise<DiagnosticResult[]> {
    console.log('🚫 Running error tests (expect 400s)...');
    const tests = [
      // Empty track IDs should trigger 400
      ...this.FUNCTIONS.map(fn => ({ fn, payload: { fromTrackId: '', toTrackId: '' } })),
      // Missing fields should trigger 400
      ...this.FUNCTIONS.map(fn => ({ fn, payload: {} }))
    ];
    
    const results = await Promise.all(
      tests.map(({ fn, payload }) => this.callFunction(fn, payload))
    );
    
    results.forEach(r => {
      const is400Error = r.details?.error?.includes('bad_request') || r.details?.error?.includes('required');
      const expectedFail = r.status === 'FAIL' && is400Error;
      console.log(`  ${expectedFail ? '✅' : '❌'} ${r.test} ${expectedFail ? '(400 as expected)' : '(unexpected)'}`);
    });
    
    return results;
  }

  async runSuccessTests(): Promise<DiagnosticResult[]> {
    console.log('🎯 Running success tests (expect 200s)...');
    const validIds = {
      fromTrackId: 'e728ea1b-aeac-431a-b223-4315a7044fa5',
      toTrackId: '11487b59-02ea-4a26-ae30-f6ac586d54e0'
    };
    
    const tests = [
      { fn: 'calculate-career-switch', payload: { ...validIds, locationId: 'US-NYC' } },
      { fn: 'location-switch-optimizer', payload: { ...validIds, topN: 5 } }
    ];
    
    const results = await Promise.all(
      tests.map(({ fn, payload }) => this.callFunction(fn, payload))
    );
    
    results.forEach(r => {
      console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${r.test} (${r.duration.toFixed(0)}ms)`);
      if (r.status === 'PASS') {
        console.log(`    Keys: [${r.details.keys.join(', ')}]`);
      }
    });
    
    return results;
  }

  async runFullDiagnostics(): Promise<void> {
    console.log('🔍 Starting Edge Function Diagnostics...\n');
    
    const [pingResults, errorResults, successResults] = await Promise.all([
      this.runPingTests(),
      this.runErrorTests(), 
      this.runSuccessTests()
    ]);
    
    const allResults = [...pingResults, ...errorResults, ...successResults];
    const passCount = allResults.filter(r => r.status === 'PASS').length;
    const errorPassCount = errorResults.filter(r => 
      r.status === 'FAIL' && (r.details?.error?.includes('bad_request') || r.details?.error?.includes('required'))
    ).length;
    
    console.log('\n📊 Diagnostic Summary:');
    console.log(`  Ping Tests: ${pingResults.filter(r => r.status === 'PASS').length}/${pingResults.length} passed`);
    console.log(`  Error Tests: ${errorPassCount}/${errorResults.length} returned expected 400s`);
    console.log(`  Success Tests: ${successResults.filter(r => r.status === 'PASS').length}/${successResults.length} passed`);
    console.log(`  Overall: ${passCount + errorPassCount}/${allResults.length} tests working correctly`);
    
    if (passCount + errorPassCount === allResults.length) {
      console.log('🎉 All diagnostics PASSED! Edge functions are working correctly.');
    } else {
      console.log('⚠️  Some diagnostics FAILED. Check the details above.');
    }
  }
}

// Create singleton instance and expose to window
const diagnostics = new EdgeDiagnostics();

// Expose to global scope for browser console access
if (typeof window !== 'undefined') {
  (window as any).edgeDiagnostics = diagnostics;
  (window as any).runEdgeDiagnostics = () => diagnostics.runFullDiagnostics();
}

export default diagnostics;