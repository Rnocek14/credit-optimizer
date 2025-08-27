import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Shield, Award, Calendar, Star } from 'lucide-react';
import { CRIGauge } from '@/components/course/CRIGauge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CompletedCourse {
  course_id: string;
  completion_date: string;
  score?: number;
  course_details: {
    title: string;
    platform_name?: string;
    difficulty?: number;
    duration_hours?: number;
    instructor_name?: string;
    instructor_reputation?: number;
  };
  criContribution?: number;
}

interface TrustTranscriptProps {
  currentCRI: number;
  computedAt?: string;
  trackId?: string;
  className?: string;
}

export function TrustTranscript({ currentCRI, computedAt, trackId, className }: TrustTranscriptProps) {
  const { toast } = useToast();

  // Fetch completed courses
  const { data: completedCourses = [], isLoading } = useQuery({
    queryKey: ['completed-courses', trackId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: events, error } = await supabase
        .from('user_course_events')
        .select('course_id, completion_date, score, created_at')
        .eq('user_id', user.id)
        .eq('event_type', 'completed')
        .order('completion_date', { ascending: false });

      if (error) throw error;

      if (!events || events.length === 0) return [];

      // Fetch course details
      const courseIds = events.map(e => e.course_id);
      const { data: courseDetails, error: courseError } = await supabase
        .from('ci_courses')
        .select(`
          id,
          title,
          difficulty,
          duration_hours,
          platform:ci_platforms(name),
          instructor:ci_instructors(name, reputation)
        `)
        .in('id', courseIds);

      if (courseError) console.error('Error fetching course details:', courseError);

      return events.map(event => {
        const details = courseDetails?.find(c => c.id === event.course_id);
        return {
          ...event,
          course_details: details ? {
            title: details.title,
            platform_name: details.platform?.name,
            difficulty: details.difficulty,
            duration_hours: details.duration_hours,
            instructor_name: details.instructor?.name,
            instructor_reputation: details.instructor?.reputation
          } : {
            title: 'Unknown Course',
            platform_name: 'Unknown Platform',
            difficulty: 1,
            duration_hours: 0,
            instructor_name: undefined,
            instructor_reputation: undefined
          },
          criContribution: Math.random() * 5 + 2 // Mock CRI contribution
        };
      });
    }
  });

  // Fetch user profile for basic info
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      return {
        name: user.email?.split('@')[0] || 'User',
        email: user.email
      };
    }
  });

  const handleExportPDF = async () => {
    try {
      // Log telemetry
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('ai_model_usage')
          .insert({
            user_id: user.id,
            task: 'transcript_export',
            route: '/transcript',
            success: true,
            function_name: 'export_trust_transcript',
            complexity: JSON.stringify({ cri: currentCRI, courses: completedCourses.length })
          });
      }

      // For now, use print functionality
      window.print();

      toast({
        title: 'Trust Transcript Export',
        description: 'Use your browser\'s print dialog to save as PDF.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Error',
        description: 'Failed to export transcript. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getDifficultyLabel = (level: number): string => {
    if (level <= 1) return 'Beginner';
    if (level <= 2) return 'Elementary';
    if (level <= 3) return 'Intermediate';
    if (level <= 4) return 'Advanced';
    return 'Expert';
  };

  const formatDuration = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">Trust Transcript</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Verified learning achievements and career readiness
                </p>
              </div>
            </div>
            <Button onClick={handleExportPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Info */}
            <div className="space-y-2">
              <h4 className="font-medium">Learner Profile</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {userProfile?.name || 'Loading...'}</p>
                <p><strong>Email:</strong> {userProfile?.email || 'Loading...'}</p>
                <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
                {computedAt && (
                  <p><strong>CRI Calculated:</strong> {new Date(computedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* CRI Score */}
            <div className="flex flex-col items-center">
              <h4 className="font-medium mb-3">Current CRI Score</h4>
              <CRIGauge value={currentCRI} size="lg" />
            </div>

            {/* Summary Stats */}
            <div className="space-y-2">
              <h4 className="font-medium">Achievement Summary</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Completed Courses:</strong> {completedCourses.length}</p>
                <p><strong>Total Learning Hours:</strong> {
                  completedCourses.reduce((sum, course) => 
                    sum + (course.course_details.duration_hours || 0), 0
                  ).toFixed(1)
                }h</p>
                <p><strong>Avg. Course Score:</strong> {
                  completedCourses.length > 0 
                    ? (completedCourses.reduce((sum, course) => sum + (course.score || 0), 0) / completedCourses.length).toFixed(1)
                    : 'N/A'
                }%</p>
                <p><strong>CRI Contribution:</strong> +{
                  completedCourses.reduce((sum, course) => sum + (course.criContribution || 0), 0).toFixed(1)
                } points</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed Courses Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Completed Learning Evidence
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedCourses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No completed courses yet</h3>
              <p className="text-muted-foreground">
                Complete courses to build your verified learning transcript.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedCourses.map((course, index) => (
                <div key={course.course_id}>
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">{course.course_details.title}</h4>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        {course.course_details.platform_name && (
                          <Badge variant="outline">{course.course_details.platform_name}</Badge>
                        )}
                        {course.course_details.difficulty && (
                          <Badge variant="outline">
                            {getDifficultyLabel(course.course_details.difficulty)}
                          </Badge>
                        )}
                        {course.course_details.duration_hours && (
                          <Badge variant="outline">
                            {formatDuration(course.course_details.duration_hours)}
                          </Badge>
                        )}
                      </div>

                      {course.course_details.instructor_name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <span>Instructor: {course.course_details.instructor_name}</span>
                          {course.course_details.instructor_reputation && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{course.course_details.instructor_reputation.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Completed: {new Date(course.completion_date).toLocaleDateString()}</span>
                        </div>
                        {course.score && (
                          <div className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            <span>Score: {course.score}%</span>
                          </div>
                        )}
                        {course.criContribution && (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <span>CRI: +{course.criContribution.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < completedCourses.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-break {
            page-break-after: always;
          }
          
          body {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}