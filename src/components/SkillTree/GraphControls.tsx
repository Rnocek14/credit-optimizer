import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, MapPin, Target, BookOpen, Code, Award, Briefcase, GitBranch, RotateCcw, TreePine, Grid3X3, Network } from 'lucide-react';
import { useSkillTree } from '@/contexts/SkillTreeContext';

export const GraphControls: React.FC = () => {
  const {
    careerPaths,
    selectedCareerPath,
    selectCareerPath,
    displayControls,
    updateDisplayControls,
    graphLayout,
    updateGraphLayout,
    criScore,
    isCriLoading,
    pivotRecommendations,
    pivotLoading,
    loading,
    dataLoaded
  } = useSkillTree();

  const handleCareerPathChange = (value: string) => {
    selectCareerPath(value);
  };

  const resetToDefault = () => {
    updateDisplayControls({
      showSkills: true,
      showCourses: false,
      showProjects: false,
      showCertifications: false,
      showJobs: false,
      showPivots: false,
      showProgress: true,
    });
    updateGraphLayout({
      type: 'hierarchical',
      direction: 'vertical'
    });
  };

  return (
    <Card className="p-4 mb-4 space-y-4">
      {/* Career Path Selection */}
      <div className="space-y-2">
        <Label htmlFor="career-path-select" className="text-sm font-medium">
          Select Career Path
        </Label>
        <Select 
          value={selectedCareerPath} 
          onValueChange={handleCareerPathChange}
        >
          <SelectTrigger id="career-path-select">
            <SelectValue placeholder="Choose a career path to explore..." />
          </SelectTrigger>
          <SelectContent>
            {careerPaths.map((path) => (
              <SelectItem key={path.id} value={path.id}>
                {path.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedCareerPath && !loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>
              {careerPaths.find(p => p.id === selectedCareerPath)?.description}
            </span>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      {selectedCareerPath && (
        <div className="flex items-center gap-2 flex-wrap">
          {loading && (
            <Badge variant="secondary" className="animate-pulse">
              <Brain className="h-3 w-3 mr-1" />
              Loading...
            </Badge>
          )}
          
          {dataLoaded && !isCriLoading && criScore !== null && (
            <Badge variant="default">
              <Brain className="h-3 w-3 mr-1" />
              CRI: {criScore.toFixed(1)}
            </Badge>
          )}
          
          {displayControls.showPivots && pivotRecommendations?.length && (
            <Badge variant="outline">
              <GitBranch className="h-3 w-3 mr-1" />
              {pivotRecommendations.length} Pivot Options
            </Badge>
          )}
        </div>
      )}

      {/* Display Controls */}
      {dataLoaded && (
        <>
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Display Options</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-skills"
                  checked={displayControls.showSkills}
                  onCheckedChange={(checked) => updateDisplayControls({ showSkills: checked })}
                />
                <Label htmlFor="show-skills" className="flex items-center gap-1 text-sm">
                  <BookOpen className="h-3 w-3" />
                  Skills
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-courses"
                  checked={displayControls.showCourses}
                  onCheckedChange={(checked) => updateDisplayControls({ showCourses: checked })}
                />
                <Label htmlFor="show-courses" className="flex items-center gap-1 text-sm">
                  <Code className="h-3 w-3" />
                  Courses
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-projects"
                  checked={displayControls.showProjects}
                  onCheckedChange={(checked) => updateDisplayControls({ showProjects: checked })}
                />
                <Label htmlFor="show-projects" className="flex items-center gap-1 text-sm">
                  <GitBranch className="h-3 w-3" />
                  Projects
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-certifications"
                  checked={displayControls.showCertifications}
                  onCheckedChange={(checked) => updateDisplayControls({ showCertifications: checked })}
                />
                <Label htmlFor="show-certifications" className="flex items-center gap-1 text-sm">
                  <Award className="h-3 w-3" />
                  Certifications
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-jobs"
                  checked={displayControls.showJobs}
                  onCheckedChange={(checked) => updateDisplayControls({ showJobs: checked })}
                />
                <Label htmlFor="show-jobs" className="flex items-center gap-1 text-sm">
                  <Briefcase className="h-3 w-3" />
                  Career Goals
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-pivots"
                  checked={displayControls.showPivots}
                  onCheckedChange={(checked) => updateDisplayControls({ showPivots: checked })}
                  disabled={pivotLoading}
                />
                <Label htmlFor="show-pivots" className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3" />
                  Pivot Paths
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-progress"
                  checked={displayControls.showProgress}
                  onCheckedChange={(checked) => updateDisplayControls({ showProgress: checked })}
                />
                <Label htmlFor="show-progress" className="flex items-center gap-1 text-sm">
                  <Target className="h-3 w-3" />
                  Progress
                </Label>
              </div>
            </div>
          </div>

          {/* View Mode Controls */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">View Mode</Label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { id: 'branched', name: 'Tree View', icon: TreePine },
                { id: 'clustered', name: 'Clusters', icon: Grid3X3 },
                { id: 'traditional', name: 'Traditional', icon: Network }
              ].map(mode => {
                const Icon = mode.icon;
                const isActive = displayControls.viewMode === mode.id;
                return (
                  <Button
                    key={mode.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateDisplayControls({ viewMode: mode.id as any })}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {mode.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Layout Controls */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Layout Settings</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="layout-type" className="text-sm">Type:</Label>
                <Select 
                  value={graphLayout.type} 
                  onValueChange={(value: 'hierarchical' | 'force' | 'circular') => 
                    updateGraphLayout({ type: value })
                  }
                >
                  <SelectTrigger id="layout-type" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hierarchical">Hierarchical</SelectItem>
                    <SelectItem value="force">Force-directed</SelectItem>
                    <SelectItem value="circular">Circular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="layout-direction" className="text-sm">Direction:</Label>
                <Select 
                  value={graphLayout.direction} 
                  onValueChange={(value: 'vertical' | 'horizontal') => 
                    updateGraphLayout({ direction: value })
                  }
                >
                  <SelectTrigger id="layout-direction" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">Vertical</SelectItem>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
                className="ml-auto"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};