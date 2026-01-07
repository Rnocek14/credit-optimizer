import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trophy, Star, Target, TrendingUp, Clock, Users, Award, MessageSquare } from 'lucide-react';
import { HubNavigation } from '@/components/HubNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MentorMetrics {
  courses_reviewed: number;
  courses_approved: number;
  courses_rejected: number;
  approval_rate: number;
  avg_review_time_hours: number;
  impact_score: number;
  quality_score: number;
}

interface Achievement {
  id: string;
  achievement_name: string;
  description: string;
  badge_emoji: string;
  points_awarded: number;
  earned_at: string;
}

interface LeaderboardEntry {
  mentor_id: string;
  rank_position: number;
  total_points: number;
  validation_score: number;
  impact_score: number;
  speed_score: number;
  quality_score: number;
  mentor_name?: string;
}

interface StudentFeedback {
  rating: number;
  course_quality_rating: number;
  learning_outcome_rating: number;
  feedback_text: string;
  created_at: string;
}

const TeachAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<MentorMetrics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [feedback, setFeedback] = useState<StudentFeedback[]>([]);
  const [timeframe, setTimeframe] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Get current user (handles both real and dev users)
      const { getCurrentUser } = await import('@/lib/authHelper');
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.log('DEBUG: No authenticated user found');
        toast({
          title: "Authentication Required",
          description: "Please log in to view analytics",
          variant: "destructive"
        });
        return;
      }

      console.log('DEBUG: Fetching analytics for user:', currentUser.id, currentUser.name);

      // Calculate date range based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeframe === 'weekly') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (timeframe === 'monthly') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else {
        startDate.setFullYear(2024, 0, 1); // All time
      }

      // Fetch mentor metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('calculate_mentor_performance_metrics', {
          mentor_user_id: currentUser.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });

      if (metricsError) throw metricsError;
      setMetrics(metricsData?.[0] || null);

      // Fetch achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('mentor_achievements')
        .select('*')
        .eq('mentor_id', currentUser.id)
        .order('earned_at', { ascending: false });

      if (achievementsError) throw achievementsError;
      setAchievements(achievementsData || []);

      // Fetch leaderboard
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('mentor_leaderboard')
        .select('*')
        .eq('period_type', timeframe === 'all_time' ? 'all_time' : timeframe)
        .order('rank_position')
        .limit(10);

      if (leaderboardError) throw leaderboardError;
      setLeaderboard(leaderboardData || []);

      // Fetch student feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('mentor_course_feedback')
        .select('*')
        .eq('mentor_id', currentUser.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (feedbackError) throw feedbackError;
      setFeedback(feedbackData || []);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkForNewAchievements = async () => {
    try {
      const { getCurrentUser } = await import('@/lib/authHelper');
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { error } = await supabase.rpc('check_mentor_achievements', {
        mentor_user_id: currentUser.id
      });

      if (error) throw error;

      // Refresh achievements after checking
      fetchAnalyticsData();
      
      toast({
        title: "Achievements Updated",
        description: "Checked for new achievements based on your recent activity"
      });
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <HubNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mentor Analytics</h1>
            <p className="text-muted-foreground">Track your impact and performance as a mentor</p>
          </div>
          <div className="flex gap-4">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={checkForNewAchievements} variant="outline">
              <Award className="h-4 w-4 mr-2" />
              Check Achievements
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="feedback">Student Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Courses Reviewed</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.courses_reviewed || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.courses_approved || 0} approved, {metrics?.courses_rejected || 0} rejected
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(metrics?.approval_rate || 0)}%</div>
                  <Progress value={metrics?.approval_rate || 0} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Review Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(metrics?.avg_review_time_hours || 0)}h</div>
                  <p className="text-xs text-muted-foreground">Per course review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(metrics?.quality_score || 0)}/100</div>
                  <Progress value={metrics?.quality_score || 0} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Approval Rate', value: metrics?.approval_rate || 0 },
                    { name: 'Quality Score', value: metrics?.quality_score || 0 },
                    { name: 'Impact Score', value: metrics?.impact_score || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Mentor Leaderboard
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Rankings based on validation quality, speed, and student impact
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.mentor_id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {entry.rank_position}
                        </div>
                        <div>
                          <p className="font-medium">
                            {entry.mentor_name || `Mentor ${entry.mentor_id.slice(0, 8)}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {entry.total_points} points
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          Quality: {Math.round(entry.quality_score)}
                        </Badge>
                        <Badge variant="secondary">
                          Speed: {Math.round(entry.speed_score)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => (
                <Card key={achievement.id}>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">{achievement.badge_emoji}</div>
                    <h3 className="font-semibold text-lg mb-2">{achievement.achievement_name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{achievement.description}</p>
                    <Badge variant="outline">+{achievement.points_awarded} points</Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Earned {new Date(achievement.earned_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {achievements.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
                  <p className="text-muted-foreground">
                    Start validating courses to earn your first achievement!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Feedback
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Feedback from students on courses you've approved
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedback.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            Overall: {item.rating}/5 ⭐
                          </Badge>
                          <Badge variant="outline">
                            Quality: {item.course_quality_rating}/5
                          </Badge>
                          <Badge variant="outline">
                            Outcome: {item.learning_outcome_rating}/5
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {item.feedback_text && (
                        <p className="text-sm text-muted-foreground italic">
                          "{item.feedback_text}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {feedback.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
                    <p className="text-muted-foreground">
                      Students will provide feedback on courses you approve
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeachAnalytics;