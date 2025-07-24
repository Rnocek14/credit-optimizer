import React, { useState } from 'react';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { useUnifiedCareerData } from '@/hooks/useUnifiedCareerData';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SkillTreeBuilder = () => {
  const [selectedCareerPath, setSelectedCareerPath] = useState<string | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  
  const { data, relationships, loading, error } = useUnifiedCareerData(selectedCareerPath);

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
      <div className="flex-1">
        <UnifiedCareerCanvas
          data={data}
          relationships={relationships}
          selectedCareerPath={selectedCareerPath}
          onNodeClick={handleNodeClick}
          showMinimap={true}
          layoutMode="hierarchy"
        />
      </div>
    </div>
  );
};

export default SkillTreeBuilder;