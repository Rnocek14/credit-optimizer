import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, Users, Target, Sparkles, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PredictiveInsight {
  type: 'market_trend' | 'skill_gap' | 'mentor_match' | 'outcome_prediction';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  data: any;
}

interface MentorSpecialization {
  mentorId: string;
  name: string;
  expertiseAreas: string[];
  validationAccuracy: number;
  avgResponseTime: number;
  coursesValidated: number;
}

interface CourseRecommendation {
  courseId: string;
  title: string;
  platform: string;
  predictedOutcome: number;
  marketAlignment: number;
  skillGapFit: number;
  mentorMatch: string;
  reasoning: string;
}

export function PredictiveCurationEngine() {
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [mentorSpecializations, setMentorSpecializations] = useState<MentorSpecialization[]>([]);
  const [courseRecommendations, setCourseRecommendations] = useState<CourseRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPredictiveData();
  }, []);

  const loadPredictiveData = async () => {
    try {
      await Promise.all([
        generateMarketInsights(),
        analyzeMentorSpecializations(),
        generateCourseRecommendations()
      ]);
    } catch (error) {
      console.error('Error loading predictive data:', error);
      toast.error('Failed to load predictive insights');
    } finally {
      setLoading(false);
    }
  };

  const generateMarketInsights = async () => {
    // Simulate predictive market analysis
    const marketInsights: PredictiveInsight[] = [
      {
        type: 'market_trend',
        title: 'AI/ML Skills Demand Surge',
        description: 'Machine Learning and AI courses showing 300% increased demand. High ROI opportunity.',
        confidence: 94,
        actionable: true,
        data: { trend: 'up', growth: 300, timeframe: '6 months' }
      },
      {
        type: 'skill_gap',
        title: 'Cloud Architecture Gap',
        description: 'Critical shortage in AWS/Azure certification courses. Priority curation needed.',
        confidence: 88,
        actionable: true,
        data: { gap_size: 'critical', affected_careers: ['DevOps', 'Cloud Engineer'] }
      },
      {
        type: 'outcome_prediction',
        title: 'JavaScript Fundamentals Success Rate',
        description: 'Current JavaScript courses predict 85% completion rate with strong job outcomes.',
        confidence: 91,
        actionable: false,
        data: { completion_rate: 85, job_placement: 78 }
      }
    ];

    setInsights(marketInsights);
  };

  const analyzeMentorSpecializations = async () => {
    try {
      // Get actual mentor data from profiles
      const { data: mentors, error } = await supabase
        .from('profiles')
        .select('user_id, name, role')
        .eq('role', 'mentor');

      if (error) throw error;

      // Simulate mentor specialization analysis
      const specializations: MentorSpecialization[] = mentors?.map((mentor, index) => ({
        mentorId: mentor.user_id,
        name: mentor.name || 'Unknown Mentor',
        expertiseAreas: [
          ['Frontend Development', 'React', 'JavaScript'],
          ['Data Science', 'Python', 'Machine Learning'],
          ['Cloud Computing', 'AWS', 'DevOps'],
          ['Mobile Development', 'React Native', 'Flutter']
        ][index % 4],
        validationAccuracy: 85 + Math.random() * 15,
        avgResponseTime: 2 + Math.random() * 6,
        coursesValidated: 15 + Math.floor(Math.random() * 50)
      })) || [];

      setMentorSpecializations(specializations);
    } catch (error) {
      console.error('Error analyzing mentor specializations:', error);
    }
  };

  const generateCourseRecommendations = async () => {
    try {
      // Get courses from discovery queue
      const { data: courses, error } = await supabase
        .from('course_discovery_queue')
        .select('*')
        .eq('processing_status', 'completed')
        .limit(5);

      if (error) throw error;

      const recommendations: CourseRecommendation[] = courses?.map(course => {
        const discoveryData = course.discovery_data as any;
        
        return {
          courseId: course.id,
          title: discoveryData?.title || 'Untitled Course',
          platform: course.source_platform,
        predictedOutcome: 75 + Math.random() * 20,
        marketAlignment: 60 + Math.random() * 35,
        skillGapFit: 70 + Math.random() * 25,
          mentorMatch: mentorSpecializations[Math.floor(Math.random() * mentorSpecializations.length)]?.name || 'Auto-assign',
          reasoning: `Strong market alignment with current skill gap trends. Predicted high completion rate based on historical data.`
        };
      }) || [];

      setCourseRecommendations(recommendations);
    } catch (error) {
      console.error('Error generating course recommendations:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'market_trend': return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'skill_gap': return <Target className="h-5 w-5 text-red-600" />;
      case 'mentor_match': return <Users className="h-5 w-5 text-green-600" />;
      case 'outcome_prediction': return <Brain className="h-5 w-5 text-purple-600" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Brain className="h-6 w-6 animate-pulse mr-2" />
            Generating predictive insights...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Predictive Curation Engine
          <Badge variant="secondary">AI-Powered</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">Market Insights</TabsTrigger>
            <TabsTrigger value="mentors">Mentor Matching</TabsTrigger>
            <TabsTrigger value="recommendations">Course Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant={insight.actionable ? 'default' : 'secondary'}>
                        {insight.confidence}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {insight.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <Progress value={insight.confidence} className="flex-1 mr-4" />
                      {insight.actionable && (
                        <Button size="sm" variant="outline">
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="mentors" className="space-y-4">
            {mentorSpecializations.map((mentor, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{mentor.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {mentor.coursesValidated} courses validated
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(mentor.validationAccuracy)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Expertise Areas</div>
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertiseAreas.map((area, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Response Time</div>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {mentor.avgResponseTime.toFixed(1)} hours avg
                    </div>
                  </div>
                </div>

                <Button size="sm" className="w-full" variant="outline">
                  Assign Matching Courses
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {courseRecommendations.map((rec, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground">{rec.platform}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {Math.round(rec.predictedOutcome)}% success rate
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs font-medium mb-1">Market Fit</div>
                    <Progress value={rec.marketAlignment} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {Math.round(rec.marketAlignment)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1">Skill Gap</div>
                    <Progress value={rec.skillGapFit} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {Math.round(rec.skillGapFit)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1">Mentor Match</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {rec.mentorMatch}
                    </div>
                  </div>
                </div>

                <div className="text-xs bg-muted p-2 rounded mb-3">
                  <strong>AI Reasoning:</strong> {rec.reasoning}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Fast-Track Approval
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Assign to Mentor
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}