import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InteractiveSkillTree } from './InteractiveSkillTree';
import { generateSyntheticSkillData, benchmarkSkillTreeSize, shouldSuggestVirtualization } from '@/utils/syntheticSkillData';
import { Play, RotateCcw, Activity } from 'lucide-react';

interface PerformanceMetrics {
  skillCount: number;
  renderTime: number;
  fitToViewTime: number;
  category: string;
  timestamp: number;
}

export const SkillTreePerformanceTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [syntheticData, setSyntheticData] = useState<any>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const renderStartTime = useRef<number>(0);
  const fitToViewStartTime = useRef<number>(0);

  // FPS tracking
  const fpsRef = useRef<number[]>([]);
  const fpsIntervalRef = useRef<NodeJS.Timeout>();

  const startFPSTracking = () => {
    fpsRef.current = [];
    let lastTime = performance.now();
    
    const trackFrame = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      const fps = 1000 / deltaTime;
      fpsRef.current.push(fps);
      lastTime = currentTime;
      
      if (fpsRef.current.length % 30 === 0) {
        const avgFPS = fpsRef.current.slice(-30).reduce((a, b) => a + b, 0) / 30;
        console.log(`[Benchmark] FPS: ${avgFPS.toFixed(1)}`);
      }
      
      if (fpsRef.current.length < 300) { // Track for 10 seconds at 30fps
        requestAnimationFrame(trackFrame);
      }
    };
    
    requestAnimationFrame(trackFrame);
  };

  const stopFPSTracking = () => {
    if (fpsRef.current.length > 0) {
      const avgFPS = fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length;
      console.log(`[Benchmark] Average FPS during test: ${avgFPS.toFixed(1)}`);
    }
  };

  const runPerformanceTest = async (skillCount: number) => {
    setIsRunning(true);
    setCurrentTest(`Testing with ${skillCount} skills`);
    
    console.log(`[Benchmark] Starting performance test with ${skillCount} skills`);
    
    // Generate synthetic data
    const data = generateSyntheticSkillData(skillCount);
    
    // Track initial render time
    renderStartTime.current = performance.now();
    setSyntheticData(data);
    
    // Start FPS tracking
    startFPSTracking();
    
    // Simulate fit-to-view operation after render
    setTimeout(() => {
      fitToViewStartTime.current = performance.now();
      // Trigger a fit-to-view operation
      setTimeout(() => {
        const fitToViewTime = performance.now() - fitToViewStartTime.current;
        const renderTime = performance.now() - renderStartTime.current;
        
        const category = benchmarkSkillTreeSize(skillCount);
        const newMetric: PerformanceMetrics = {
          skillCount,
          renderTime,
          fitToViewTime,
          category,
          timestamp: Date.now()
        };
        
        setMetrics(prev => [...prev, newMetric]);
        
        console.log(`[Benchmark] ${category}: ${renderTime.toFixed(2)}ms render time`);
        console.log(`[Benchmark] Fit-to-view: ${fitToViewTime.toFixed(2)}ms`);
        
        if (shouldSuggestVirtualization(renderTime)) {
          console.warn(`[Benchmark] RECOMMENDATION: Consider virtualization with React Window or off-screen culling for trees with ${skillCount}+ skills (render time: ${renderTime.toFixed(2)}ms > 400ms threshold)`);
        }
        
        stopFPSTracking();
        setIsRunning(false);
        setCurrentTest('');
      }, 1000);
    }, 100);
  };

  const runFullTestSuite = async () => {
    const testSizes = [12, 25, 50, 100, 150];
    for (const size of testSizes) {
      await new Promise(resolve => {
        runPerformanceTest(size);
        setTimeout(resolve, 3000); // Wait 3 seconds between tests
      });
    }
  };

  const resetTests = () => {
    setMetrics([]);
    setSyntheticData(null);
    setCurrentTest('');
    stopFPSTracking();
  };

  const getMetricColor = (renderTime: number) => {
    if (renderTime < 100) return 'text-green-600';
    if (renderTime < 250) return 'text-yellow-600';
    if (renderTime < 400) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBadgeVariant = (renderTime: number) => {
    if (renderTime < 100) return 'default';
    if (renderTime < 250) return 'secondary';
    if (renderTime < 400) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Skill Tree Performance Testing
          </CardTitle>
          <CardDescription>
            Run synthetic performance tests with varying skill tree sizes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => runPerformanceTest(12)}
              disabled={isRunning}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Small (12)
            </Button>
            <Button 
              onClick={() => runPerformanceTest(25)}
              disabled={isRunning}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Medium (25)
            </Button>
            <Button 
              onClick={() => runPerformanceTest(50)}
              disabled={isRunning}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Large (50)
            </Button>
            <Button 
              onClick={() => runPerformanceTest(100)}
              disabled={isRunning}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              XL (100)
            </Button>
            <Button 
              onClick={() => runPerformanceTest(150)}
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              XXL (150)
            </Button>
            <Button 
              onClick={runFullTestSuite}
              disabled={isRunning}
              variant="secondary"
            >
              Run Full Suite
            </Button>
            <Button 
              onClick={resetTests}
              disabled={isRunning}
              variant="ghost"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {currentTest && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800 font-medium">{currentTest}...</p>
            </div>
          )}

          {metrics.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Performance Results:</h4>
              <div className="grid gap-2">
                {metrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={getBadgeVariant(metric.renderTime)}>
                        {metric.category}
                      </Badge>
                      <span className="font-medium">{metric.skillCount} skills</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={getMetricColor(metric.renderTime)}>
                        Render: {metric.renderTime.toFixed(2)}ms
                      </span>
                      <span className="text-gray-600">
                        Fit-to-view: {metric.fitToViewTime.toFixed(2)}ms
                      </span>
                      {shouldSuggestVirtualization(metric.renderTime) && (
                        <Badge variant="destructive" className="text-xs">
                          Consider Virtualization
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {syntheticData && (
        <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <InteractiveSkillTree
            skills={syntheticData.skills}
            userProgress={syntheticData.userProgress}
            skillEdges={syntheticData.skillEdges}
            filteredSkills={syntheticData.skills}
            recommendedSkills={syntheticData.recommendedSkills}
            goalSkills={syntheticData.goalSkills}
            checkpointSkills={syntheticData.goalSkills.slice(0, 2)}
            availableCategories={syntheticData.categories}
            onSkillClick={(skill) => console.log('Synthetic skill clicked:', skill.name)}
            careerPathName="Demo Career Path"
          />
        </div>
      )}
    </div>
  );
};