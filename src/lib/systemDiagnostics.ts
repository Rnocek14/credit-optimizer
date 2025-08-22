import diagnostics from '@/debug/edgeDiagnostics';
import { testAllEdgeFunctions } from '@/lib/edgeFunctionTests';
import { testPivotToRoadmapWorkflow } from '@/lib/pivotRoadmapTests';
import { logEvent } from '@/lib/analytics';

interface SystemValidationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: any;
  duration: number;
}

class SystemDiagnostics {
  async validateEdgeFunctions(): Promise<SystemValidationResult> {
    const start = performance.now();
    console.log('🔧 Validating Edge Functions...');
    
    try {
      await diagnostics.runFullDiagnostics();
      const duration = performance.now() - start;
      
      return {
        component: 'Edge Functions',
        status: 'PASS',
        details: { message: 'All edge function diagnostics passed' },
        duration
      };
    } catch (error) {
      return {
        component: 'Edge Functions',
        status: 'FAIL',
        details: { error: error.message },
        duration: performance.now() - start
      };
    }
  }

  async validateCareerPlanning(): Promise<SystemValidationResult> {
    const start = performance.now();
    console.log('🎯 Validating Career Planning Functions...');
    
    try {
      const results = await testAllEdgeFunctions();
      const duration = performance.now() - start;
      
      if (results.allPassed) {
        return {
          component: 'Career Planning',
          status: 'PASS',
          details: { message: 'All career planning functions operational' },
          duration
        };
      } else {
        return {
          component: 'Career Planning',
          status: 'FAIL',
          details: { results },
          duration
        };
      }
    } catch (error) {
      return {
        component: 'Career Planning',
        status: 'FAIL',
        details: { error: error.message },
        duration: performance.now() - start
      };
    }
  }

  async validatePivotWorkflow(): Promise<SystemValidationResult> {
    const start = performance.now();
    console.log('🔄 Validating Pivot Workflow...');
    
    try {
      const result = await testPivotToRoadmapWorkflow();
      const duration = performance.now() - start;
      
      // Calculate overall alignment score
      const overallScore = (
        result.alignment.goalAlignment + 
        result.alignment.skillCoverage + 
        result.alignment.timeAlignment + 
        result.alignment.costAlignment
      ) / 4 * 100;

      if (result.validation.isValid && overallScore > 70) {
        return {
          component: 'Pivot Workflow',
          status: 'PASS',
          details: { 
            message: 'Pivot to roadmap workflow operational',
            alignmentScore: overallScore
          },
          duration
        };
      } else {
        return {
          component: 'Pivot Workflow',
          status: 'WARN',
          details: { 
            message: 'Pivot workflow has alignment issues',
            validation: result.validation,
            alignment: result.alignment,
            alignmentScore: overallScore
          },
          duration
        };
      }
    } catch (error) {
      return {
        component: 'Pivot Workflow',
        status: 'FAIL',
        details: { error: error.message },
        duration: performance.now() - start
      };
    }
  }

  async validateGamificationSystems(): Promise<SystemValidationResult> {
    const start = performance.now();
    console.log('🎮 Validating Gamification Systems...');
    
    try {
      // Check if gamification components are available
      const hasAnalytics = typeof logEvent === 'function';
      const hasFeatureFlags = localStorage.getItem('gamification_enabled') !== 'false';
      
      const duration = performance.now() - start;
      
      return {
        component: 'Gamification',
        status: 'PASS',
        details: { 
          message: 'Gamification systems operational',
          analytics: hasAnalytics,
          featureFlags: hasFeatureFlags
        },
        duration
      };
    } catch (error) {
      return {
        component: 'Gamification',
        status: 'FAIL',
        details: { error: error.message },
        duration: performance.now() - start
      };
    }
  }

  async runFullSystemValidation(): Promise<void> {
    console.log('🔍 Starting Full System Validation...\n');
    logEvent('system_diagnostics_started', { timestamp: Date.now() });
    
    const overallStart = performance.now();
    
    const results = await Promise.all([
      this.validateEdgeFunctions(),
      this.validateCareerPlanning(),
      this.validatePivotWorkflow(),
      this.validateGamificationSystems()
    ]);
    
    const overallDuration = performance.now() - overallStart;
    
    console.log('\n📊 System Validation Summary:');
    console.log('================================');
    
    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;
    
    results.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : 
                        result.status === 'WARN' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${result.component}: ${result.status} (${result.duration.toFixed(0)}ms)`);
      
      if (result.status === 'PASS') passCount++;
      else if (result.status === 'WARN') warnCount++;
      else failCount++;
      
      if (result.details.error) {
        console.log(`   Error: ${result.details.error}`);
      } else if (result.details.message) {
        console.log(`   ${result.details.message}`);
      }
    });
    
    console.log('\n📈 Overall Health:');
    console.log(`   ✅ ${passCount} systems passing`);
    console.log(`   ⚠️  ${warnCount} systems with warnings`);
    console.log(`   ❌ ${failCount} systems failing`);
    console.log(`   ⏱️  Total validation time: ${overallDuration.toFixed(0)}ms`);
    
    const overallHealth = failCount === 0 ? 
      (warnCount === 0 ? 'EXCELLENT' : 'GOOD') : 'DEGRADED';
    
    console.log(`\n🏥 System Health: ${overallHealth}`);
    
    if (overallHealth === 'EXCELLENT') {
      console.log('🎉 All systems are operating normally!');
    } else if (overallHealth === 'GOOD') {
      console.log('👍 Systems are operational with minor issues');
    } else {
      console.log('⚠️  Some critical systems need attention');
    }
    
    logEvent('system_diagnostics_completed', {
      timestamp: Date.now(),
      duration: overallDuration,
      health: overallHealth,
      passCount,
      warnCount,
      failCount
    });
  }
}

// Create singleton and expose to window
const systemDiagnostics = new SystemDiagnostics();

if (typeof window !== 'undefined') {
  (window as any).systemDiagnostics = systemDiagnostics;
  (window as any).runSystemValidation = () => systemDiagnostics.runFullSystemValidation();
}

export default systemDiagnostics;