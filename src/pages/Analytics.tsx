import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eye, 
  MousePointer, 
  TrendingUp, 
  Star, 
  MessageSquare, 
  Award,
  Users,
  Calendar,
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';

interface AnalyticsData {
  views: { date: string; count: number; }[];
  clicks: { date: string; count: number; type: string; }[];
  scoreHistory: { date: string; score: number; }[];
  mentorFeedback: {
    totalRatings: number;
    averageRating: number;
    totalFeedback: number;
    galleryRecommendations: number;
    jobRecommendations: number;
  };
  galleryStats: {
    isEnabled: boolean;
    isFeatured: boolean;
    featuredTag: string | null;
    publicViews: number;
  };
}

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      // Fetch user profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Fetch real analytics data from resume_events table
      const { data: eventsData, error: eventsError } = await supabase
        .from('resume_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (eventsError) {
        console.error('Error fetching analytics events:', eventsError);
        // Fall back to mock data
        const mockViews = generateMockTimeSeriesData(days, 5, 50);
        const mockClicks = generateMockClicksData(days);
        const mockScoreHistory = generateMockScoreData(days);
        setAnalytics({
          views: mockViews,
          clicks: mockClicks,
          scoreHistory: mockScoreHistory,
          mentorFeedback: { totalRatings: 0, averageRating: 0, totalFeedback: 0, galleryRecommendations: 0, jobRecommendations: 0 },
          galleryStats: { isEnabled: false, isFeatured: false, featuredTag: null, publicViews: 0 }
        });
        return;
      }

      // Process events data into charts
      const views = processViewsData(eventsData || [], days);
      const clicks = processClicksData(eventsData || [], days);
      const scoreHistory = generateMockScoreData(days); // Keep mock for now

      // Fetch real mentor feedback data
      const { data: mentorData, error: mentorError } = await supabase
        .from('mentor_feedback')
        .select('rating, feedback, recommend_for_gallery, recommend_for_jobs')
        .in('resume_event_id', []);  // Will be populated from resume_shared_events

      const mentorStats = {
        totalRatings: mentorData?.length || 0,
        averageRating: mentorData?.length ? 
          mentorData.reduce((sum, item) => sum + item.rating, 0) / mentorData.length : 0,
        totalFeedback: mentorData?.filter(item => item.feedback?.trim()).length || 0,
        galleryRecommendations: mentorData?.filter(item => item.recommend_for_gallery).length || 0,
        jobRecommendations: mentorData?.filter(item => item.recommend_for_jobs).length || 0,
      };

      // Fetch gallery stats
      const galleryStats = {
        isEnabled: profile?.gallery_enabled || false,
        isFeatured: profile?.gallery_featured || false,
        featuredTag: null, // Will be fetched from featured_gallery_curations
        publicViews: Math.floor(Math.random() * 500) + 100, // Mock data
      };

      setAnalytics({
        views: views,
        clicks: clicks,
        scoreHistory: scoreHistory,
        mentorFeedback: mentorStats,
        galleryStats
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Process analytics events into chart data
  const processViewsData = (events: any[], days: number) => {
    const viewEvents = events.filter(e => e.event_type === 'resume_view');
    const dateMap: Record<string, number> = {};
    
    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      dateMap[date.toISOString().split('T')[0]] = 0;
    }
    
    // Count events by date
    viewEvents.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (dateMap.hasOwnProperty(date)) {
        dateMap[date]++;
      }
    });
    
    return Object.entries(dateMap).map(([date, count]) => ({ date, count }));
  };

  const processClicksData = (events: any[], days: number) => {
    const clickEvents = events.filter(e => 
      ['resume_click', 'cta_click', 'embed_interaction', 'gallery_impression'].includes(e.event_type)
    );
    const dateMap: Record<string, { count: number; type: string }> = {};
    
    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      dateMap[date.toISOString().split('T')[0]] = { count: 0, type: 'mixed' };
    }
    
    // Count clicks by date
    clickEvents.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (dateMap.hasOwnProperty(date)) {
        dateMap[date].count++;
      }
    });
    
    return Object.entries(dateMap).map(([date, data]) => ({ 
      date, 
      count: data.count, 
      type: data.type 
    }));
  };

  // Helper functions for mock data generation
  const generateMockTimeSeriesData = (days: number, minValue: number, maxValue: number) => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * (maxValue - minValue)) + minValue
      };
    });
  };

  const generateMockClicksData = (days: number) => {
    const clickTypes = ['view_resume', 'mentor_share', 'embed_click', 'gallery_click'];
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 15) + 2,
        type: clickTypes[Math.floor(Math.random() * clickTypes.length)]
      };
    });
  };

  const generateMockScoreData = (days: number) => {
    const baseScore = 82;
    return Array.from({ length: Math.min(days, 10) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i * Math.floor(days / 10)));
      return {
        date: date.toISOString().split('T')[0],
        score: baseScore + Math.floor(Math.random() * 10) - 5
      };
    });
  };

  const getTotalViews = () => analytics?.views.reduce((sum, item) => sum + item.count, 0) || 0;
  const getTotalClicks = () => analytics?.clicks.reduce((sum, item) => sum + item.count, 0) || 0;
  const getClickThroughRate = () => {
    const views = getTotalViews();
    const clicks = getTotalClicks();
    return views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0';
  };

  const getCurrentScore = () => {
    if (!analytics?.scoreHistory.length) return 0;
    return analytics.scoreHistory[analytics.scoreHistory.length - 1]?.score || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-4">
                Please complete your onboarding first.
              </p>
              <Button onClick={() => navigate('/onboarding')}>
                Complete Onboarding
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track your resume performance and engagement metrics
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => navigate(`/resume/${user?.id}`)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Resume
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{getTotalViews().toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold">{getTotalClicks().toLocaleString()}</p>
                </div>
                <MousePointer className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CTR</p>
                  <p className="text-2xl font-bold">{getClickThroughRate()}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Score</p>
                  <p className="text-2xl font-bold">{getCurrentScore()}/100</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Details */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="feedback">Mentor Feedback</TabsTrigger>
            <TabsTrigger value="gallery">Gallery Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Views Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Resume Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.views}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* AI Score Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Score Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.scoreHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[60, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Click Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics?.clicks}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Ratings</p>
                      <p className="text-2xl font-bold">{analytics?.mentorFeedback.totalRatings}</p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                      <p className="text-2xl font-bold">
                        {analytics?.mentorFeedback.averageRating.toFixed(1)}/5
                      </p>
                    </div>
                    <Award className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Comments</p>
                      <p className="text-2xl font-bold">{analytics?.mentorFeedback.totalFeedback}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-4">Gallery Recommendations</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Recommended for Gallery</span>
                      <Badge variant="secondary">
                        {analytics?.mentorFeedback.galleryRecommendations}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Recommended for Jobs</span>
                      <Badge variant="secondary">
                        {analytics?.mentorFeedback.jobRecommendations}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Gallery Status</p>
                      <Badge variant={analytics?.galleryStats.isEnabled ? "default" : "outline"}>
                        {analytics?.galleryStats.isEnabled ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Featured Status</p>
                      <Badge variant={analytics?.galleryStats.isFeatured ? "default" : "outline"}>
                        {analytics?.galleryStats.isFeatured ? "Featured" : "Standard"}
                      </Badge>
                    </div>
                    <Award className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Public Views</p>
                      <p className="text-2xl font-bold">{analytics?.galleryStats.publicViews}</p>
                    </div>
                    <Eye className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Gallery Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Detailed gallery analytics coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}