import React from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
// HubNavigation now provided by AppShell at route level
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { 
  Trophy,
  Clock,
  Star,
  TrendingUp,
  Building,
  GraduationCap,
  Target,
  Zap,
  Award,
  Users
} from 'lucide-react';

interface TrackMetrics {
  id: string;
  title: string;
  progress: number;
  totalXP: number;
  avgTeacherRating: number;
  totalCourses: number;
  completionRate: number;
  avgTimePerCourse: number;
  providerMix: Record<string, number>;
  totalInvestment: number;
  skillsCovered: number;
}

export default function TrackComparePage() {
  const { user, isLoading: authLoading } = useSecureAuth();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.CAREER_TRACKS(user?.id),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('career_tracks')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('order_index');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mock data for demonstration - in real implementation, this would be calculated from actual data
  const trackMetrics: TrackMetrics[] = tracks.map((track, index) => ({
    id: track.id,
    title: track.title,
    progress: 45 + (index * 15) % 85,
    totalXP: 850 + (index * 200),
    avgTeacherRating: 4.2 + (index * 0.2) % 0.8,
    totalCourses: 8 + (index * 2),
    completionRate: 75 + (index * 5) % 25,
    avgTimePerCourse: 12 + (index * 3),
    providerMix: {
      university: 30 + (index * 10) % 40,
      online_platform: 40 + (index * 10) % 40,
      bootcamp: 20 + (index * 5) % 20,
      employer: 10 + (index * 5) % 10,
    },
    totalInvestment: 500 + (index * 300),
    skillsCovered: 15 + (index * 3),
  }));

  // Calculate best-in-class badges
  const bestXPPerHour = trackMetrics.reduce((best, track) => 
    (track.totalXP / (track.totalCourses * track.avgTimePerCourse)) > 
    (best.totalXP / (best.totalCourses * best.avgTimePerCourse)) ? track : best
  );

  const bestTeacherRating = trackMetrics.reduce((best, track) => 
    track.avgTeacherRating > best.avgTeacherRating ? track : best
  );

  const fastestCompletion = trackMetrics.reduce((best, track) => 
    track.avgTimePerCourse < best.avgTimePerCourse ? track : best
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (trackMetrics.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="text-center py-12">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No tracks to compare</h3>
              <p className="text-sm text-muted-foreground">
                Create multiple learning tracks to see detailed comparisons and insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Track Comparison</h1>
            <p className="text-muted-foreground">
              Compare your learning tracks across key metrics and find optimization opportunities.
            </p>
          </div>

          {/* Comparison Grid */}
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {trackMetrics.map((track) => (
              <Card key={track.id} className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{track.title}</span>
                    <div className="flex gap-1">
                      {track.id === bestXPPerHour.id && (
                        <Badge className="text-xs bg-yellow-500 text-yellow-50">
                          <Zap className="w-3 h-3 mr-1" />
                          Best XP/Hour
                        </Badge>
                      )}
                      {track.id === bestTeacherRating.id && (
                        <Badge className="text-xs bg-green-500 text-green-50">
                          <Star className="w-3 h-3 mr-1" />
                          Best Rating
                        </Badge>
                      )}
                      {track.id === fastestCompletion.id && (
                        <Badge className="text-xs bg-blue-500 text-blue-50">
                          <Clock className="w-3 h-3 mr-1" />
                          Fastest
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Progress Overview */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>{track.progress}%</span>
                    </div>
                    <Progress value={track.progress} className="h-2" />
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Trophy className="w-3 h-3" />
                        Total XP
                      </div>
                      <div className="font-semibold">{track.totalXP.toLocaleString()}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3" />
                        Avg Rating
                      </div>
                      <div className="font-semibold">{track.avgTeacherRating.toFixed(1)}/5</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <GraduationCap className="w-3 h-3" />
                        Courses
                      </div>
                      <div className="font-semibold">{track.totalCourses}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        Completion
                      </div>
                      <div className="font-semibold">{track.completionRate}%</div>
                    </div>
                  </div>

                  {/* Provider Mix */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Building className="w-3 h-3" />
                      Provider Mix
                    </div>
                    <div className="space-y-1">
                      {Object.entries(track.providerMix).map(([type, percentage]) => (
                        <div key={type} className="flex items-center justify-between text-xs">
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-right">{percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Investment</span>
                      <span className="font-medium">${track.totalInvestment}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Skills Covered</span>
                      <span className="font-medium">{track.skillsCovered}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Time/Course</span>
                      <span className="font-medium">{track.avgTimePerCourse}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">XP/Hour</span>
                      <span className="font-medium">
                        {Math.round(track.totalXP / (track.totalCourses * track.avgTimePerCourse))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Optimization Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold">Best Learning Efficiency</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>{bestXPPerHour.title}</strong> delivers the highest XP per hour invested.
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                    <Star className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold">Highest Quality</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>{bestTeacherRating.title}</strong> has the best average teacher ratings.
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold">Fastest Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>{fastestCompletion.title}</strong> offers the quickest course completion times.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}