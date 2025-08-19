import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useUnifiedRecommendations } from '@/hooks/useUnifiedRecommendations';
import { useRealCourseRecommendations } from '@/hooks/useRealCourseRecommendations';
import { useSkillGaps } from '@/hooks/useSkillGaps';
import { usePathStore } from '@/stores/usePathStore';
import { ArrowRight, Plus, Clock, Zap, TrendingUp } from 'lucide-react';
import type { PathNode } from '@/stores/usePathStore';

interface NextStepsPanelProps {
  activeNode?: PathNode;
  userId: string;
}

export function NextStepsPanel({ activeNode, userId }: NextStepsPanelProps) {
  const { addNode, connect, nodes } = usePathStore();
  const { data: unifiedRecommendations = [], isLoading: recsLoading } = useUnifiedRecommendations(userId);
  const { data: skillGaps = [] } = useSkillGaps(userId);
  const skillGapStrings = skillGaps.map(gap => gap.skill);
  const { recommendations: courseRecs = [], isLoadingRecommendations } = useRealCourseRecommendations(skillGapStrings, 80);

  // Filter recommendations based on current node's skills and difficulty
  const getSmartSuggestions = () => {
    if (!activeNode) return { skillBased: [], courseBased: [], projectBased: [] };

    const nodeSkills = activeNode.data.skillTags || [];
    const nodeDifficulty = activeNode.data.difficulty || 'beginner';
    
    // Get next difficulty level
    const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentLevel = difficultyLevels.indexOf(nodeDifficulty);
    const nextLevel = difficultyLevels[Math.min(currentLevel + 1, difficultyLevels.length - 1)];

    // Filter unified recommendations
    const skillBased = unifiedRecommendations
      .filter(rec => rec.type === 'skill_gap' && 
        rec.skills?.some(skill => !nodeSkills.includes(skill)))
      .slice(0, 3);

    // Filter course recommendations
    const courseBased = courseRecs
      .filter(course => 
        course.difficulty?.toLowerCase() === nextLevel
      )
      .slice(0, 3);

    // Create project suggestions
    const projectBased = unifiedRecommendations
      .filter(rec => rec.type === 'proof_project')
      .slice(0, 2);

    return { skillBased, courseBased, projectBased };
  };

  const { skillBased, courseBased, projectBased } = getSmartSuggestions();

  const handleAddRecommendation = (rec: any, type: 'course' | 'project' | 'skill') => {
    if (!activeNode) return;

    const newNode: Omit<PathNode, 'id'> = {
      type: (type === 'project' ? 'project' : 'course') as PathNode['type'],
      data: {
        title: rec.title || rec.name || `New ${type}`,
        description: rec.description || `Learn ${rec.skills?.join(', ') || 'new skills'}`,
        skillTags: rec.skills || rec.skillTags || [],
        difficulty: (rec.difficulty?.toLowerCase() || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        estimatedHours: rec.duration_hours || (rec.timeEstimate ? parseInt(rec.timeEstimate) : undefined),
        cri: rec.criBoost || rec.criContribution,
        cost: rec.cost,
        status: 'available' as const,
      },
      position: {
        x: activeNode.position.x + 300,
        y: activeNode.position.y + Math.random() * 100 - 50,
      },
    };

    const nodeId = addNode(newNode);
    
    // Connect with suggested edge
    connect(activeNode.id, nodeId, 'suggested');
  };

  if (recsLoading || isLoadingRecommendations) {
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
                    {rec.criBoost && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +{rec.criBoost}%
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

      {/* Course Recommendations */}
      {courseBased.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Related Courses
          </h4>
          <div className="space-y-2">
            {courseBased.map((course, i) => (
              <Card key={i} className="p-3 hover:bg-accent/50 transition-colors">
                <CardContent className="p-0 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium truncate">{course.title}</h5>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddRecommendation(course, 'course')}
                      className="shrink-0 ml-2"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {course.criContribution && (
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        CRI +{Math.round(course.criContribution)}
                      </Badge>
                    )}
                    {course.duration_hours && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {course.duration_hours}h
                      </Badge>
                    )}
                    {course.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        {course.difficulty}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {course.platform}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
                    {project.criBoost && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +{project.criBoost}%
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

      {skillBased.length === 0 && courseBased.length === 0 && projectBased.length === 0 && (
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