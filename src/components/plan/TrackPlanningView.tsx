import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, BookOpen, Trophy, Calendar, ChevronRight } from 'lucide-react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useTracks } from '@/hooks/useTracks';
import { TrackSelector } from '@/components/tracks/TrackSelector';

interface Goal {
  id: string;
  title: string;
  progress: number;
  target_date?: string;
  priority_score?: number;
}

interface Course {
  id: string;
  title: string;
  cri_score?: number;
  difficulty?: number;
  estimated_hours?: number;
}

interface TrackPlanningViewProps {
  goals?: Goal[];
  recommendedCourses?: Course[];
  className?: string;
}

export function TrackPlanningView({ 
  goals = [], 
  recommendedCourses = [], 
  className 
}: TrackPlanningViewProps) {
  const { activeTrackId } = useActiveTrackStore();
  const { tracks } = useTracks();

  // Get active track info
  const activeTrack = tracks.find(track => track.id === activeTrackId);

  // Filter goals by track (assuming goals have track_id)
  const trackGoals = goals.filter(goal => 
    // For now, show all goals if no track filtering is implemented
    true
  );

  const getCRIBadgeColor = (score?: number) => {
    if (!score) return 'bg-muted';
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getPriorityBadge = (score?: number) => {
    if (!score) return { label: 'Medium', color: 'bg-yellow-500' };
    if (score >= 80) return { label: 'High', color: 'bg-red-500' };
    if (score >= 60) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-green-500' };
  };

  const formatDaysUntil = (dateString?: string) => {
    if (!dateString) return null;
    const target = new Date(dateString);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Track Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <CardTitle>Track Planning</CardTitle>
            </div>
            <TrackSelector />
          </div>
          <CardDescription>
            {activeTrack ? (
              <>Plan your learning journey for {activeTrack.title}</>
            ) : (
              <>Select a track to begin planning your career path</>
            )}
          </CardDescription>
        </CardHeader>
        {activeTrack && (
          <CardContent>
            <div className="space-y-4">
              {/* Track Overview */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">{activeTrack.title}</h3>
                {activeTrack.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {activeTrack.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {activeTrack.time_to_proficiency && (
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {activeTrack.time_to_proficiency}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Goals Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Track Goals
          </CardTitle>
          <CardDescription>
            {trackGoals.length === 0 
              ? 'No goals set for this track yet'
              : `${trackGoals.length} active goals`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trackGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No goals defined yet</p>
              <p className="text-sm">Set goals to track your progress in this career track</p>
              <Button className="mt-4" variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {trackGoals.map((goal) => {
                const priority = getPriorityBadge(goal.priority_score);
                const daysUntil = formatDaysUntil(goal.target_date);
                
                return (
                  <div key={goal.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{goal.title}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`${priority.color} text-white`}>
                            {priority.label} Priority
                          </Badge>
                          {daysUntil && (
                            <Badge variant="outline">
                              <Calendar className="h-3 w-3 mr-1" />
                              {daysUntil}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Courses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Recommended Learning
          </CardTitle>
          <CardDescription>
            AI-curated courses based on your track and CRI intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendedCourses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No course recommendations available</p>
              <p className="text-sm">Complete your profile to get personalized recommendations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedCourses.slice(0, 5).map((course) => (
                <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{course.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {course.cri_score && (
                        <Badge 
                          className={`text-xs ${getCRIBadgeColor(course.cri_score)} text-white`}
                        >
                          <Trophy className="h-3 w-3 mr-1" />
                          CRI {Math.round(course.cri_score)}
                        </Badge>
                      )}
                      {course.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          Level {course.difficulty}
                        </Badge>
                      )}
                      {course.estimated_hours && (
                        <span className="text-xs text-muted-foreground">
                          ~{course.estimated_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Add to Plan
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}