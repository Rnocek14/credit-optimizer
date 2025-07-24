import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  TreePine, 
  Grid3X3, 
  Network, 
  Route,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { useSkillTree } from '@/contexts/SkillTreeContext';
import { useProgressiveDisclosure } from './ProgressiveDisclosure';
import { usePathHighlighter } from './PathHighlighter';

export const ViewModeControls: React.FC = () => {
  const { displayControls, updateDisplayControls } = useSkillTree();
  const { viewMode, setViewMode, clearFocus } = useProgressiveDisclosure();
  const { learningPaths, getRecommendedPath } = usePathHighlighter();

  const recommendedPath = getRecommendedPath();

  const viewModes = [
    {
      id: 'branched',
      name: 'Tree View',
      icon: TreePine,
      description: 'Hierarchical tree structure showing learning progression'
    },
    {
      id: 'clustered',
      name: 'Clusters',
      icon: Grid3X3,
      description: 'Skills grouped by category with smart clustering'
    },
    {
      id: 'traditional',
      name: 'Traditional',
      icon: Network,
      description: 'Classic skill tree layout'
    }
  ];

  const handleViewModeChange = (mode: 'branched' | 'clustered' | 'traditional') => {
    updateDisplayControls({ viewMode: mode });
    clearFocus();
  };

  const togglePathHighlighting = () => {
    updateDisplayControls({ 
      pathHighlighting: !displayControls.pathHighlighting 
    });
  };

  return (
    <div className="space-y-4">
      {/* View Mode Selection */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          View Mode
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {viewModes.map(mode => {
            const Icon = mode.icon;
            const isActive = displayControls.viewMode === mode.id;
            return (
              <Button
                key={mode.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange(mode.id as any)}
                className="flex flex-col items-center gap-1 h-auto p-3"
                title={mode.description}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{mode.name}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Learning Path Controls */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Route className="w-4 h-4" />
          Learning Paths
        </h3>
        
        {/* Path Highlighting Toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm">Highlight Recommended Path</span>
          <Button
            variant={displayControls.pathHighlighting ? 'default' : 'outline'}
            size="sm"
            onClick={togglePathHighlighting}
          >
            {displayControls.pathHighlighting ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Recommended Path Info */}
        {recommendedPath && displayControls.pathHighlighting && (
          <div className="bg-primary/10 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Recommended</span>
            </div>
            <div>
              <h4 className="font-medium">{recommendedPath.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {recommendedPath.estimatedDuration} • {recommendedPath.difficulty}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                {recommendedPath.nodes.length} items
              </Badge>
              <Badge 
                variant={recommendedPath.difficulty === 'beginner' ? 'default' : 
                        recommendedPath.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {recommendedPath.difficulty}
              </Badge>
            </div>
          </div>
        )}

        {/* Available Paths */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Available Paths</span>
          <div className="grid gap-2 max-h-32 overflow-y-auto">
            {learningPaths.slice(0, 4).map(path => (
              <div 
                key={path.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
              >
                <div>
                  <div className="font-medium">{path.name}</div>
                  <div className="text-muted-foreground">{path.estimatedDuration}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {path.nodes.length}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Layer Controls */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Visible Layers</h3>
        <div className="space-y-2">
          {[
            { key: 'showJobs', label: 'Career Goals', icon: '🎯' },
            { key: 'showSkills', label: 'Skills', icon: '💡' },
            { key: 'showCourses', label: 'Courses', icon: '📚' },
            { key: 'showProjects', label: 'Projects', icon: '🔨' },
            { key: 'showCertifications', label: 'Certifications', icon: '🏆' },
          ].map(({ key, label, icon }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <span>{icon}</span>
                {label}
              </span>
              <Button
                variant={displayControls[key as keyof typeof displayControls] ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateDisplayControls({ 
                  [key]: !displayControls[key as keyof typeof displayControls] 
                })}
              >
                {displayControls[key as keyof typeof displayControls] ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};