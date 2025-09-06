import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ToastAction } from '@/components/ui/toast';
import { 
  Bot, 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  X, 
  ThumbsUp, 
  Zap, 
  BookOpen,
  ArrowRight,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Compass,
  Flame
} from 'lucide-react';
import { useMayaProactiveInsights } from '@/hooks/useMayaProactiveInsights';
import { useCourseRecommendationUtils } from '@/hooks/useCourseRecommendationUtils';
import { CourseRecoRow } from '@/components/CourseRecoRow';
import { getCurrentUser } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { RecoBundle } from '@/types/course-intelligence';

interface MayaLiveInsightsProps {
  userName?: string;
  currentStreak: number;
  nextStep?: {
    title: string;
    type: string;
  };
  recommendations?: Array<{
    title: string;
    priority: string;
  }>;
}

export function MayaLiveInsights({ 
  userName = "there", 
  currentStreak, 
  nextStep,
  recommendations = []
}: MayaLiveInsightsProps) {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  });
  
  const { 
    insights, 
    loading, 
    generateInsights, 
    dismissInsight, 
    undismissInsight, 
    markAsActedUpon, 
    fetchInsights,
    lastFetchedAt 
  } = useMayaProactiveInsights(user?.id);
  
  const {
    fetchCourseSummaries,
    saveCourseToRecommendations,
    logRecommendationView,
    isCourseLoading
  } = useCourseRecommendationUtils();
  
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [courseDetails, setCourseDetails] = useState<Record<string, any[]>>({});
  const [hasLoggedView, setHasLoggedView] = useState<Record<string, boolean>>({});
  const [hasTriedAutoGeneration, setHasTriedAutoGeneration] = useState(false);
  const { toast } = useToast();
  const pendingUndos = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Auto-generate insights on mount if needed
  useEffect(() => {
    if (user?.id && insights.length === 0 && !loading && !hasTriedAutoGeneration) {
      setHasTriedAutoGeneration(true);
      generateInsights('daily', true);
    }
  }, [user?.id, insights.length, loading, hasTriedAutoGeneration, generateInsights]);

  // Cleanup pending undos
  useEffect(() => {
    return () => {
      Object.values(pendingUndos.current).forEach(clearTimeout);
      pendingUndos.current = {};
    };
  }, []);

  const currentInsight = insights[currentInsightIndex] || null;
  const recoBundle: RecoBundle | null = currentInsight?.context_data?.reco_bundle || null;

  // Load course details for current insight
  useEffect(() => {
    if (!currentInsight || !recoBundle || !user?.id) return;
    
    const courseIds = recoBundle.topCourses.map(c => c.courseId);
    const cacheKey = `${currentInsight.id}-${courseIds.join(',')}`;
    
    if (courseDetails[cacheKey] || isCourseLoading(courseIds)) return;

    const loadCourseDetails = async () => {
      try {
        const courses = await fetchCourseSummaries(courseIds);
        setCourseDetails(prev => ({ ...prev, [cacheKey]: courses }));
        
        if (!hasLoggedView[currentInsight.id]) {
          setHasLoggedView(prev => ({ ...prev, [currentInsight.id]: true }));
          await logRecommendationView(user.id, currentInsight.id, courseIds, recoBundle.trackId);
        }
      } catch (error) {
        console.error('Failed to load course details:', error);
      }
    };

    loadCourseDetails();
  }, [currentInsight?.id, recoBundle, user?.id, fetchCourseSummaries, logRecommendationView, courseDetails, hasLoggedView, isCourseLoading]);

  const getInsightIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Flame className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Target className="h-4 w-4 text-blue-500" />;
      case 'low': return <Compass className="h-4 w-4 text-green-500" />;
      default: return <Lightbulb className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent': 
        return {
          card: 'border-l-red-500 bg-gradient-to-br from-red-50 to-background',
          badge: 'bg-red-100 text-red-700 border-red-200',
          accent: 'bg-red-500'
        };
      case 'high': 
        return {
          card: 'border-l-orange-500 bg-gradient-to-br from-orange-50 to-background',
          badge: 'bg-orange-100 text-orange-700 border-orange-200',
          accent: 'bg-orange-500'
        };
      case 'medium': 
        return {
          card: 'border-l-blue-500 bg-gradient-to-br from-blue-50 to-background',
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          accent: 'bg-blue-500'
        };
      default: 
        return {
          card: 'border-l-primary bg-gradient-to-br from-primary/5 to-background',
          badge: 'bg-muted text-muted-foreground border-border',
          accent: 'bg-primary'
        };
    }
  };

  const handleDismissInsight = async () => {
    if (!currentInsight || pendingUndos.current[currentInsight.id]) return;
    
    const insight = currentInsight;
    dismissInsight(insight.id);
    
    if (insights.length > 1) {
      setCurrentInsightIndex(prev => prev === insights.length - 1 ? 0 : prev);
    }

    const timeout = setTimeout(() => {
      delete pendingUndos.current[insight.id];
    }, 8000);
    
    pendingUndos.current[insight.id] = timeout;

    toast({
      title: 'Insight dismissed',
      description: 'You can undo this action for a few seconds.',
      action: (
        <ToastAction 
          altText="Undo" 
          onClick={async () => {
            clearTimeout(pendingUndos.current[insight.id]);
            delete pendingUndos.current[insight.id];
            await undismissInsight(insight.id);
            await fetchInsights();
          }}
        >
          Undo
        </ToastAction>
      ),
      duration: 8000,
    });
  };

  const handleNextInsight = () => {
    if (insights.length > 1) {
      setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
    }
  };

  const handleActOnInsight = () => {
    if (currentInsight) {
      markAsActedUpon(currentInsight.id);
      toast({
        title: 'Great choice!',
        description: 'Maya noted that you acted on this insight.',
        duration: 3000,
      });
    }
  };

  const getCurrentCourseDetails = () => {
    if (!currentInsight || !recoBundle) return [];
    const courseIds = recoBundle.topCourses.map(c => c.courseId);
    const cacheKey = `${currentInsight.id}-${courseIds.join(',')}`;
    return courseDetails[cacheKey] || [];
  };

  const styles = currentInsight ? getPriorityStyles(currentInsight.priority) : getPriorityStyles('default');

  return (
    <Card className={cn("border-l-4 transition-all duration-300 hover:shadow-md", styles.card)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              {insights.length > 0 && (
                <div className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full", styles.accent)} />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold">Maya's Live Insights</span>
              {lastFetchedAt && insights.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(lastFetchedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {currentInsight && (
              <Badge className={cn("text-xs font-medium", styles.badge)}>
                {getInsightIcon(currentInsight.priority)}
                <span className="ml-1.5 capitalize">{currentInsight.priority}</span>
              </Badge>
            )}
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3 w-3 mr-1.5" />
              AI Powered
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded-lg" />
            <div className="h-20 bg-muted animate-pulse rounded-lg" />
            <div className="h-3 bg-muted animate-pulse rounded-lg w-3/4" />
          </div>
        ) : insights.length > 0 && currentInsight ? (
          <div className="space-y-4">
            {/* Debug info */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
              Debug: {insights.length} insights loaded, current index: {currentInsightIndex}
            </div>
            
            {/* Insight Navigation */}
            {insights.length > 1 && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Insight {currentInsightIndex + 1} of {insights.length}
                  </div>
                  <Progress value={((currentInsightIndex + 1) / insights.length) * 100} className="w-16 h-2" />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNextInsight}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Main Insight Card */}
            <div className={cn("p-4 rounded-xl border-2 transition-all duration-200", styles.card)}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getInsightIcon(currentInsight.priority)}
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base leading-relaxed text-foreground">
                      {currentInsight.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-60 hover:opacity-100 transition-opacity"
                      onClick={handleDismissInsight}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentInsight.content}
                  </p>

                  {/* Action Section */}
                  {currentInsight.context_data?.next_actions && (
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium"
                        onClick={handleActOnInsight}
                      >
                        <CheckCircle className="h-3 w-3 mr-2" />
                        Mark Complete
                      </Button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {currentInsight.context_data.timeline || 'Suggested action'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Course Recommendations */}
            {recoBundle?.topCourses?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Recommended Learning Path</h4>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                
                <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20">
                  {getCurrentCourseDetails().length > 0 ? (
                    getCurrentCourseDetails().slice(0, 2).map((course) => {
                      const recoItem = recoBundle?.topCourses.find(tc => tc.courseId === course.id);
                      return (
                        <CourseRecoRow
                          key={course.id}
                          title={course.title}
                          platform={course.platform?.name || 'Unknown Platform'}
                          difficulty={course.difficulty}
                          durationHours={course.duration_hours}
                          url={course.url}
                          expectedCRIChange={recoItem?.expectedCRIChange}
                          onSave={() => saveCourseToRecommendations(user?.id || '', course.id, course.title)}
                          className="text-xs bg-background/50"
                        />
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      {isCourseLoading(recoBundle?.topCourses.map(c => c.courseId) || []) 
                        ? 'Loading personalized courses...' 
                        : 'No courses available right now'
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Ready to generate insights</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Maya will analyze your profile and learning patterns to provide personalized career insights.
              </p>
              <div className="text-xs text-muted-foreground mb-2">
                Debug: insights.length = {insights.length}, loading = {loading.toString()}, userId = {user?.id}
              </div>
            </div>
            <Button 
              onClick={() => generateInsights('daily')}
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              <Zap className="h-4 w-4 mr-2" />
              Generate Insights
            </Button>
          </div>
        )}

        {/* Status Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>
              {insights.length > 0 
                ? `${insights.length} active insight${insights.length !== 1 ? 's' : ''}`
                : 'No active insights'
              }
            </span>
          </div>
          
          {insights.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateInsights('daily')}
              disabled={loading}
              className="h-7 text-xs"
            >
              Refresh
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}