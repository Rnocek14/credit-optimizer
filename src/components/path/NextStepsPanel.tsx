import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useIntelligenceLayer } from '@/hooks/useIntelligenceLayer';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { usePathStore } from '@/stores/usePathStore';
import { ArrowRight, Plus, Clock, Zap, TrendingUp } from 'lucide-react';
import type { PathNode } from '@/stores/usePathStore';

interface NextStepsPanelProps {
  activeNode?: PathNode;
  userId: string;
}

export function NextStepsPanel({ activeNode, userId }: NextStepsPanelProps) {
  const { addNode, connect, nodes } = usePathStore();
  const { activeTrackId } = useActiveTrackStore();
  const {
    recommendations,
    isLoading: recsLoading,
  } = useIntelligenceLayer(userId, activeTrackId ?? undefined);

  // Filter recommendations based on current node's skills and difficulty
  const getSmartSuggestions = () => {
    if (!activeNode) return { skillBased: [], projectBased: [] };

    const nodeSkills = activeNode.data.skillTags || [];

    // Filter skill gap recommendations
    const skillBased = recommendations
      .filter(rec => rec.type === 'skill_gap' && 
        rec.skills?.some(skill => !nodeSkills.includes(skill)))
      .slice(0, 3);

    // Filter project recommendations
    const projectBased = recommendations
      .filter(rec => rec.type === 'proof_project')
      .slice(0, 2);

    return { skillBased, projectBased };
  };

  const { skillBased, projectBased } = getSmartSuggestions();

  const handleAddRecommendation = (rec: any, type: 'project' | 'skill') => {
    if (!activeNode) return;

    const newNode: Omit<PathNode, 'id'> = {
      type: (type === 'project' ? 'project' : 'course') as PathNode['type'],
      data: {
        title: rec.title || `New ${type}`,
        description: rec.description || `Learn ${rec.skills?.join(', ') || 'new skills'}`,
        skillTags: rec.skills || [],
        difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
        estimatedHours: rec.durationHours,
        cri: rec.criContribution,
        status: 'available' as const,
      },
      position: {
        x: activeNode.position.x + 300,
        y: activeNode.position.y + Math.random() * 100 - 50,
      },
    };

    const nodeId = addNode(newNode);
    connect(activeNode.id, nodeId, 'suggested');
  };

  if (recsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeNode) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <ArrowRight className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Next Steps</h3>
          <p className="text-sm text-muted-foreground">
            Select a node to see smart recommendations for your next learning steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Smart Recommendations</h3>
        <p className="text-xs text-muted-foreground">
          Based on your skill gaps and current progress
        </p>
      </div>

      {/* Skill Gap Recommendations */}
      {skillBased.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Fill Skill Gaps
          </h4>
          <div className="space-y-2">
            {skillBased.map((rec) => (
              <Card key={rec.id} className="p-3 hover:bg-accent/50 transition-colors">
                <CardContent className="p-0 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium truncate">{rec.title}</h5>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {rec.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddRecommendation(rec, 'skill')}
                      className="shrink-0 ml-2"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {rec.criContribution != null && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +{Math.round(rec.criContribution * 100)}%
                      </Badge>
                    )}
                    {rec.timeEstimate && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {rec.timeEstimate}
                      </Badge>
                    )}
                    <Badge variant={
                      rec.priority === 'critical' ? 'destructive' :
                      rec.priority === 'high' ? 'default' : 'secondary'
                    } className="text-xs">
                      {rec.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Course Recommendations — Phase 2: will appear when buildCandidates includes courses */}

      {/* Project Recommendations */}
      {projectBased.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Proof Projects
          </h4>
          <div className="space-y-2">
            {projectBased.map((project) => (
              <Card key={project.id} className="p-3 hover:bg-accent/50 transition-colors">
                <CardContent className="p-0 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium truncate">{project.title}</h5>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddRecommendation(project, 'project')}
                      className="shrink-0 ml-2"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {project.criContribution != null && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +{Math.round(project.criContribution * 100)}%
                      </Badge>
                    )}
                    {project.timeEstimate && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {project.timeEstimate}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {skillBased.length === 0 && projectBased.length === 0 && (
        <div className="text-center py-6 space-y-2">
          <ArrowRight className="w-12 h-12 text-muted-foreground mx-auto" />
          <h4 className="font-medium">No recommendations yet</h4>
          <p className="text-sm text-muted-foreground">
            Complete more courses to unlock personalized next steps.
          </p>
        </div>
      )}
    </div>
  );
}
