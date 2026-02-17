import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Award, 
  Zap, 
  Target, 
  TrendingUp, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { useIntelligenceLayer } from '@/hooks/useIntelligenceLayer';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useUser } from '@/hooks/useUser';
import { toUnifiedRecommendationsLegacy } from '@/shared/lib/intelligence/toUnifiedRecommendation';
import { Link } from 'react-router-dom';

export const AchievementsRail: React.FC = () => {
  const { user } = useUser();
  const { activeTrackId } = useActiveTrackStore();
  const { recommendations: intelligenceRecs, isLoading: loading } = useIntelligenceLayer(user?.id, activeTrackId ?? undefined);
  const recommendations = toUnifiedRecommendationsLegacy(intelligenceRecs);

  // Mock recent achievements - in real implementation, fetch from backend
  const recentAchievements = [
    {
      id: 1,
      type: 'badge',
      title: 'Python Expert',
      description: 'Completed advanced Python projects',
      earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      icon: '🐍',
      xp: 200
    },
    {
      id: 2,
      type: 'certificate',
      title: 'Data Science Foundations',
      description: 'Verified by DataCamp',
      earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      icon: '📊',
      xp: 300
    },
    {
      id: 3,
      type: 'milestone',
      title: 'Portfolio Milestone',
      description: '5 projects completed',
      earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      icon: '🎯',
      xp: 150
    }
  ];

  // Mock project updates
  const projectUpdates = [
    {
      id: 1,
      title: 'Customer Analytics Dashboard',
      status: 'completed',
      progress: 100,
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 2,
      title: 'ML Prediction Model',
      status: 'in_progress',
      progress: 75,
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 3,
      title: 'API Integration Project',
      status: 'started',
      progress: 25,
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  ];

  // Get next suggested skill from recommendations
  const nextSkill = recommendations?.find(r => r.type === 'skill_gap');

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'started': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Recent Achievements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAchievements.map((achievement) => (
            <div key={achievement.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="text-2xl">{achievement.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight">{achievement.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    +{achievement.xp} XP
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(achievement.earnedAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          <Separator className="my-3" />
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/progress?tab=credentials">
              View All Achievements
              <ArrowRight className="h-3 w-3 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Latest Project Updates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Project Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectUpdates.map((project) => (
            <div key={project.id} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm leading-tight">{project.title}</h4>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(project.status)}`}
                >
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {project.progress}% complete
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(project.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          <Separator className="my-3" />
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/progress?tab=portfolio">
              Manage Projects
              <ArrowRight className="h-3 w-3 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Next Suggested Skill */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Next Suggestion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextSkill ? (
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium text-sm mb-1">{nextSkill.title}</h4>
                <p className="text-xs text-muted-foreground mb-3">{nextSkill.description}</p>
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    {nextSkill.priority} priority
                  </Badge>
                  {nextSkill.timeEstimate && (
                    <Badge variant="outline" className="text-xs">
                      {nextSkill.timeEstimate}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {nextSkill.actions?.map((action, index) => (
                    <Button
                      key={index}
                      asChild
                      variant={index === 0 ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                    >
                      <Link to={action.href || '#'}>
                        {action.label}
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Zap className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading suggestions...' : 'No suggestions available'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
