import { useState, useCallback } from 'react';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { SkillTreeEngine } from '@/components/unified/SkillTreeEngine';
import { LayoutControls } from '@/components/LayoutControls';
import { LayoutDebugPanel, LayoutDebugData } from '@/components/LayoutDebugPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SkillTreeBuilder = () => {
  const [selectedCareerPath, setSelectedCareerPath] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'hierarchy' | 'force' | 'circular' | 'tree' | 'focus'>('hierarchy');
  const [forceStrength, setForceStrength] = useState(0.5);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [debugData, setDebugData] = useState<LayoutDebugData>({
    status: 'idle',
    nodeCount: 0,
    edgeCount: 0,
    simulationProgress: 0,
    lastCalculationTime: 0,
    errors: [],
    warnings: [],
    relationships: { strong: 0, medium: 0, weak: 0 },
    forces: { charge: -300, link: 0.5, collision: 1, positioning: 0.8, clustering: 0.3 },
    layoutMode: 'hierarchy'
  });

  const { nodes, edges, loading, error, getNodesByType, isEmpty, reload } = useCareerGraph({ careerPathId: selectedCareerPath });

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNodeId(node.id);
    setSelectedNodeType(node.type);
    console.log('🎯 Node clicked:', { nodeId: node.id, nodeType: node.type });
  }, []);

  const handleCareerPathChange = useCallback((pathId: string) => {
    setSelectedCareerPath(pathId === 'all' ? null : pathId);
  }, []);

  // ✅ PHASE 2: Create controls component for unified engine
  const controlsComponent = showControls ? (
    <div className="absolute top-4 right-4 z-10">
      <LayoutControls
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        forceStrength={forceStrength}
        onForceStrengthChange={setForceStrength}
        animationSpeed={animationSpeed}
        onAnimationSpeedChange={setAnimationSpeed}
        isCalculating={isCalculating}
        onRecalculateLayout={() => {
          setIsCalculating(true);
          setTimeout(() => {
            setLayoutMode(prev => prev);
            setIsCalculating(false);
          }, 100);
        }}
        onResetView={() => {
          // Reset view will be handled by React Flow
        }}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />
    </div>
  ) : null;

  // ✅ PHASE 2: Create header component for builder mode
  const headerComponent = (
    <div className="border-b border-border p-4 bg-background">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Unified Career Tree Builder</h1>
          <p className="text-muted-foreground">
            Explore the complete learning journey from skills to career outcomes
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedCareerPath || 'all'} onValueChange={handleCareerPathChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select career path" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Career Paths</SelectItem>
              {getNodesByType('job').map(job => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setShowControls(!showControls)}
          >
            Layout Controls
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
          >
            Debug Panel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Badge variant="outline" className="px-3 py-1">
          {getNodesByType('skill').length} Skills
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          {getNodesByType('course').length} Courses
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          {getNodesByType('project').length} Projects
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          {getNodesByType('certification').length} Certifications
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          {getNodesByType('job').length} Career Paths
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          {edges.length} Connections
        </Badge>
        <Badge variant="secondary" className="px-3 py-1">
          Layout: {layoutMode}
        </Badge>
      </div>

      {selectedNodeId && selectedNodeType && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm">
            <span className="font-medium">Selected:</span> {selectedNodeType} ({selectedNodeId})
          </p>
        </div>
      )}
    </div>
  );

  // ✅ PHASE 2: Create debug panel component 
  const debugPanelComponent = showDebugPanel ? (
    <div className="absolute top-0 right-0 h-full w-80 z-10">
      <LayoutDebugPanel
        debugData={debugData}
        onClearLogs={() => {
          setDebugData(prev => ({
            ...prev,
            errors: [],
            warnings: []
          }));
        }}
        onRecalculate={() => {
          setSelectedCareerPath(prev => prev);
        }}
        onExportDebugData={() => {
          const debugJson = JSON.stringify(debugData, null, 2);
          const blob = new Blob([debugJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `layout-debug-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      />
    </div>
  ) : null;

  return (
    <div className="h-screen flex flex-col bg-background relative">
      {headerComponent}
      
      <div className="flex-1 relative">
        <SkillTreeEngine
          nodes={nodes}
          edges={edges}
          loading={loading}
          error={error}
          onNodeClick={handleNodeClick}
          onReload={reload}
          mode="builder"
          showStats={false}
          showControls={false}
          showRightRail={false}
          layoutAlgorithm="semantic-hierarchy"
          layoutConfig={{
            spacing: {
              nodeWidth: 250,
              nodeHeight: 120,
              levelGap: 200,
              nodeGap: 50
            }
          }}
        />
        
        {controlsComponent}
        {debugPanelComponent}
      </div>
    </div>
  );
};

export default SkillTreeBuilder;