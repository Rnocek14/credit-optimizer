import React, { useState, useCallback } from 'react';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { LayoutControls, LayoutMode } from '@/components/LayoutControls';
import { useUnifiedCareerData } from '@/hooks/useUnifiedCareerData';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ReactFlowProvider } from '@xyflow/react';

const SkillTreeBuilder = () => {
  const [selectedCareerPath, setSelectedCareerPath] = useState<string | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hierarchy');
  const [forceStrength, setForceStrength] = useState(0.5);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [isCalculatingLayout, setIsCalculatingLayout] = useState(false);
  const [showControls, setShowControls] = useState(false);
  
  const { data, relationships, loading, error, refetch } = useUnifiedCareerData(selectedCareerPath);

  const handleNodeClick = (nodeId: string, nodeType: string) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeType(nodeType);
    
    // Find the node data
    let nodeData = null;
    switch (nodeType) {
      case 'skill':
        nodeData = data?.skills.find(s => s.id === nodeId);
        break;
      case 'job':
        nodeData = data?.jobs.find(j => j.id === nodeId);
        break;
      case 'course':
        nodeData = data?.courses.find(c => c.id === nodeId);
        break;
      case 'project':
        nodeData = data?.projects.find(p => p.id === nodeId);
        break;
      case 'certification':
        nodeData = data?.certifications.find(c => c.id === nodeId);
        break;
      case 'careerStep':
        nodeData = data?.careerSteps.find(s => s.id === nodeId);
        break;
    }
    
    if (nodeData) {
      const nodeName = nodeData.title || nodeData.name || 'Node';
      toast.success(`Selected ${nodeType}: ${nodeName}`);
    }
  };

  const handleCareerPathChange = (pathId: string) => {
    setSelectedCareerPath(pathId === 'all' ? undefined : pathId);
  };

  const handleLayoutModeChange = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
    toast.info(`Switched to ${mode} layout mode`);
  }, []);

  const handleRecalculateLayout = useCallback(() => {
    // Trigger recalculation by changing a key prop
    setIsCalculatingLayout(true);
    toast.info('Recalculating layout...');
  }, []);

  const handleResetView = useCallback(() => {
    // This will be handled by the ReactFlow fitView function
    toast.success('View reset');
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center">
          <p className="text-destructive mb-4">Error loading career data: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No career data available</p>
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
                {data.jobs.map(job => (
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
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <Badge variant="outline" className="px-3 py-1">
            {data.skills.length} Skills
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {data.courses.length} Courses
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {data.projects.length} Projects
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {data.certifications.length} Certifications
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {data.jobs.length} Career Paths
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {relationships.length} Connections
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
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <UnifiedCareerCanvas
            data={data}
            relationships={relationships}
            selectedCareerPath={selectedCareerPath}
            onNodeClick={handleNodeClick}
            showMinimap={true}
            layoutMode={layoutMode}
            forceOptions={{
              strength: {
                charge: -300 * forceStrength,
                link: 0.5 * forceStrength,
                collision: 1,
                positioning: 0.8,
                clustering: 0.3 * forceStrength,
              },
              iterations: Math.floor(300 * animationSpeed),
            }}
            onLayoutCalculating={setIsCalculatingLayout}
          />
          
          {/* Layout Controls Panel */}
          {showControls && (
            <div className="absolute top-4 right-4 z-10">
              <LayoutControls
                layoutMode={layoutMode}
                onLayoutModeChange={handleLayoutModeChange}
                onRecalculateLayout={handleRecalculateLayout}
                onResetView={handleResetView}
                forceStrength={forceStrength}
                onForceStrengthChange={setForceStrength}
                animationSpeed={animationSpeed}
                onAnimationSpeedChange={setAnimationSpeed}
                isCalculating={isCalculatingLayout}
                nodeCount={data ? 
                  data.skills.length + 
                  data.courses.length + 
                  data.projects.length + 
                  data.certifications.length + 
                  data.careerSteps.length + 
                  data.jobs.length : 0
                }
                edgeCount={relationships.length}
              />
            </div>
          )}
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default SkillTreeBuilder;