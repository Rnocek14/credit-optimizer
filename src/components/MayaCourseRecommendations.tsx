import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, BookOpen, Star, TrendingUp, ExternalLink } from 'lucide-react';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { safeOpenExternal } from '@/components/ui/SafeExternalLink';

interface MayaCourseRecommendationsProps {
  skillGaps?: string[];
  careerGoals?: string[];
  maxRecommendations?: number;
  compact?: boolean;
}

interface Course {
  id: string;
  title: string;
  platform: string;
  url?: string;
  difficulty?: string;
  cost?: string;
  description?: string;
  skill_tags?: string[];
  active?: boolean;
  is_ai_recommended?: boolean;
  mentor_id?: string;
  reasoning?: string;
  created_at?: string;
  updated_at?: string;
}

export function MayaCourseRecommendations({ 
  skillGaps = [], 
  careerGoals = [],
  maxRecommendations = 3,
  compact = false 
}: MayaCourseRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [mayaInsights, setMayaInsights] = useState<string>('');
  const { recommendCourses, loading: mayaLoading } = useEnhancedMaya();
  const { toast } = useToast();

  useEffect(() => {
    if (skillGaps.length > 0 || careerGoals.length > 0) {
      generateRecommendations();
    } else {
      loadTopCourses();
    }
  }, [skillGaps, careerGoals]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      // Get Maya's recommendations
      if (skillGaps.length > 0) {
        const mayaResponse = await recommendCourses(skillGaps, careerGoals);
        if (mayaResponse?.response) {
          setMayaInsights(mayaResponse.response);
        }
      }

      // Fetch matching courses from database
      const { data: courses, error } = await supabase
        .from('recommended_courses')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(maxRecommendations * 2); // Get more to filter

      if (error) throw error;

      // Filter courses based on skill gaps
      let filteredCourses = courses || [];
      if (skillGaps.length > 0) {
        filteredCourses = filteredCourses.filter(course =>
          course.skill_tags?.some(tag => 
            skillGaps.some(skill => 
              tag.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      }

      // Sort by most recent and take top recommendations
      filteredCourses.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      setRecommendations(filteredCourses.slice(0, maxRecommendations));

    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: 'Error loading recommendations',
        description: 'Showing top courses instead',
        variant: 'destructive'
      });
      loadTopCourses();
    } finally {
      setLoading(false);
    }
  };

  const loadTopCourses = async () => {
    setLoading(true);
    try {
      const { data: courses, error } = await supabase
        .from('recommended_courses')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(maxRecommendations);

      if (error) throw error;
      setRecommendations(courses || []);
      setMayaInsights('Here are some top-rated courses to advance your career.');
    } catch (error) {
      console.error('Error loading top courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityBadge = (course: Course) => {
    // Use AI recommendation status as quality indicator
    if (course.is_ai_recommended) {
      return { text: 'AI Recommended', color: 'bg-blue-100 text-blue-800' };
    }
    return { text: 'Quality Course', color: 'bg-green-100 text-green-800' };
  };

  if (loading || mayaLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Maya's Course Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Generating recommendations...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Maya's Course Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recommendations available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Maya's Course Recommendations
        </CardTitle>
        {mayaInsights && !compact && (
          <div className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg">
            {mayaInsights.length > 200 ? `${mayaInsights.substring(0, 200)}...` : mayaInsights}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((course, index) => (
          <div key={course.id} className={`${compact ? 'p-3' : 'p-4'} border rounded-lg hover:bg-muted/50 transition-colors`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium ${compact ? 'text-sm' : 'text-base'} line-clamp-1`}>
                    {course.title}
                  </h4>
                  {(() => {
                    const badge = getQualityBadge(course);
                    return (
                      <Badge className={`${badge.color} text-xs`}>
                        {badge.text}
                      </Badge>
                    );
                  })()}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{course.platform}</span>
                  {course.difficulty && (
                    <>
                      <span>•</span>
                      <span>{course.difficulty}</span>
                    </>
                  )}
                  {course.cost && (
                    <>
                      <span>•</span>
                      <span>{course.cost}</span>
                    </>
                  )}
                </div>

                {!compact && course.skill_tags && course.skill_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {course.skill_tags.slice(0, 3).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs px-2 py-0.5">
                        {tag}
                      </Badge>
                    ))}
                    {course.skill_tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        +{course.skill_tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {!compact && course.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {course.description}
                  </p>
                )}
              </div>

              <Button
                size={compact ? "sm" : "default"}
                onClick={() => safeOpenExternal(course.url)}
                disabled={!course.url}
                className="flex-shrink-0"
              >
                {compact ? (
                  <ExternalLink className="h-3 w-3" />
                ) : (
                  <>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.location.href = '/explore-courses'}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Explore All Courses
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}