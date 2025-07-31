import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { LayoutControls } from '@/components/LayoutControls';
import { LayoutDebugPanel, LayoutDebugData } from '@/components/LayoutDebugPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

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

  const { nodes, edges, loading, error, getNodesByType, isEmpty } = useCareerGraph({ careerPathId: selectedCareerPath });

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNodeId(node.id);
    setSelectedNodeType(node.type);
    console.log('🎯 Node clicked:', { nodeId: node.id, nodeType: node.type });
  }, []);

  const handleCareerPathChange = useCallback((pathId: string) => {
    setSelectedCareerPath(pathId === 'all' ? null : pathId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6">
          <CardContent className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div>
              <p className="font-medium">Loading Career Data</p>
              <p className="text-sm text-muted-foreground">
                Fetching skills, courses, projects, and career paths...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6">
          <CardContent className="text-center">
            <p className="text-destructive mb-4">Error loading career data</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6">
          <CardContent className="text-center">
            <p className="text-muted-foreground">No career data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
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

      {/* Canvas */}
      <div className="flex-1 relative flex">
        <div className="flex-1">
          <ReactFlowProvider>
            <UnifiedCareerCanvas
              nodes={nodes}
              edges={edges}
              selectedCareerPath={selectedCareerPath}
              onNodeClick={handleNodeClick}
              layoutAlgorithm={layoutMode === 'hierarchy' ? 'hierarchical' : layoutMode === 'force' ? 'force' : 'hierarchical'}
              layoutConfig={{
                spacing: {
                  nodeWidth: 250,
                  nodeHeight: 120,
                  levelGap: 200,
                  nodeGap: 50
                }
              }}
            />
            
            {showControls && (
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
                    // Force recalculation by toggling layout mode
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
            )}
          </ReactFlowProvider>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && (
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
        )}
      </div>
    </div>
  );
};

export default SkillTreeBuilder;