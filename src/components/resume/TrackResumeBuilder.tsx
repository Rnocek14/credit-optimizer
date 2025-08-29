import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Star, Trophy, Award, GraduationCap } from 'lucide-react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useTrackTranscript } from '@/hooks/useTrackTranscript';
import { useAltTranscript } from '@/hooks/useAltTranscript';
import { useTracks } from '@/hooks/useTracks';
import { useToast } from '@/hooks/use-toast';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  title: string;
  instructor?: string;
  difficulty?: number;
  cri_score?: number;
  completion_rate?: number;
  instructor_rating?: number;
}

interface TrackResumeBuilderProps {
  courses?: Course[];
  className?: string;
}

export function TrackResumeBuilder({ courses = [], className }: TrackResumeBuilderProps) {
  const { activeTrackId } = useActiveTrackStore();
  const { tracks } = useTracks();
  const { usage } = useTrackTranscript(activeTrackId);
  const { usage: altUsage } = useAltTranscript(activeTrackId);
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Get active track info
  const activeTrack = tracks.find(track => track.id === activeTrackId);
  
  // Filter courses by track usage
  const trackCourses = courses.filter(course => 
    usage.some(u => u.course_id === course.id)
  );

  // Calculate track metrics
  const avgCRI = trackCourses.reduce((acc, course) => acc + (course.cri_score || 0), 0) / trackCourses.length || 0;
  const avgDifficulty = trackCourses.reduce((acc, course) => acc + (course.difficulty || 0), 0) / trackCourses.length || 0;
  const totalCourses = trackCourses.length;

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
      />
    ));
  };

  const getCRIBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500 text-white';
    if (score >= 60) return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getPrestigeTierBadge = (rating?: number) => {
    if (!rating) return null;
    
    let tier = 'Bronze';
    let color = 'bg-amber-600';
    
    if (rating >= 4.5) {
      tier = 'Platinum';
      color = 'bg-purple-600';
    } else if (rating >= 4.0) {
      tier = 'Gold';
      color = 'bg-yellow-500';
    } else if (rating >= 3.5) {
      tier = 'Silver';
      color = 'bg-gray-400';
    }

    return (
      <Badge className={`${color} text-white`}>
        <Award className="h-3 w-3 mr-1" />
        {tier} Mentor
      </Badge>
    );
  };

  const handleExportResume = async () => {
    if (!activeTrack) return;

    setIsExporting(true);
    try {
      // Fetch alternative courses data with details
      const altCourseDetails = await Promise.all(
        altUsage.map(async (usage) => {
          const { data } = await supabase
            .from('alternative_courses')
            .select('*')
            .eq('id', usage.alt_course_id)
            .single();
          
          return {
            title: data?.title,
            provider: data?.provider,
            url: data?.url,
            difficulty: data?.difficulty,
            estimated_hours: data?.estimated_hours,
            cri_score: data?.cri_score,
            tagged_at: usage.created_at,
            note: usage.note
          };
        })
      );

      // Create resume data with intelligence metrics
      const resumeData = {
        track: {
          id: activeTrack.id,
          title: activeTrack.title,
          description: activeTrack.description,
        },
        metrics: {
          totalCourses,
          avgCRI: Math.round(avgCRI),
          avgDifficulty: Math.round(avgDifficulty * 10) / 10,
          completionDate: new Date().toISOString(),
        },
        courses: trackCourses.map(course => ({
          title: course.title,
          instructor: course.instructor,
          cri_score: Math.round(course.cri_score || 0),
          difficulty: course.difficulty,
          instructor_rating: course.instructor_rating,
          completion_rate: course.completion_rate,
        })),
        alternative_courses: altCourseDetails.filter(course => course.title), // Filter out failed fetches
        generated_at: new Date().toISOString(),
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(resumeData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTrack.title.toLowerCase().replace(/\s+/g, '-')}-resume.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Track telemetry event
      trackTelemetryEvent({
        task: 'resume_exported',
        complexity: { 
          track_id: activeTrack.id,
          total_courses: totalCourses,
          total_alt_courses: altUsage.length,
          avg_cri: Math.round(avgCRI),
          avg_difficulty: Math.round(avgDifficulty * 10) / 10
        }
      });

      toast({
        title: 'Resume exported',
        description: 'Your track resume with intelligence metrics has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export resume. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!activeTrackId || !activeTrack) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Track Resume Builder
          </CardTitle>
          <CardDescription>
            Select a track to build your resume with intelligence metrics
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Track Resume Builder</CardTitle>
          </div>
          <Button 
            onClick={handleExportResume} 
            disabled={isExporting || totalCourses === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Resume'}
          </Button>
        </div>
        <CardDescription>
          {activeTrack.title} • {totalCourses} courses with intelligence metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Track Overview */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{activeTrack.title}</h3>
            {activeTrack.description && (
              <p className="text-muted-foreground">{activeTrack.description}</p>
            )}
            
            {/* Track Metrics */}
            {totalCourses > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Badge className={getCRIBadgeColor(avgCRI)}>
                  <Trophy className="h-3 w-3 mr-1" />
                  Avg CRI {Math.round(avgCRI)}
                </Badge>
                
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Avg Difficulty:</span>
                  <div className="flex items-center gap-0.5">
                    {getDifficultyStars(Math.round(avgDifficulty))}
                  </div>
                </div>
                
                <Badge variant="outline">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {totalCourses} courses completed
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Course List */}
          {totalCourses === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No courses in this track yet</p>
              <p className="text-sm">Add courses to build your resume</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-medium">Completed Coursework</h4>
              
              {trackCourses.map((course, index) => (
                <div key={course.id} className="border rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium">{course.title}</h5>
                        {course.instructor && (
                          <p className="text-sm text-muted-foreground">
                            Instructor: {course.instructor}
                          </p>
                        )}
                      </div>
                      
                      {course.instructor_rating && getPrestigeTierBadge(course.instructor_rating)}
                    </div>

                    {/* Course Intelligence Metrics */}
                    <div className="flex flex-wrap items-center gap-2">
                      {course.cri_score && (
                        <Badge className={getCRIBadgeColor(course.cri_score)}>
                          <Trophy className="h-3 w-3 mr-1" />
                          CRI {Math.round(course.cri_score)}
                        </Badge>
                      )}
                      
                      {course.difficulty && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Difficulty:</span>
                          <div className="flex items-center gap-0.5">
                            {getDifficultyStars(course.difficulty)}
                          </div>
                        </div>
                      )}
                      
                      {course.completion_rate && (
                        <Badge variant="outline">
                          {Math.round(course.completion_rate * 100)}% completion rate
                        </Badge>
                      )}
                      
                      {course.instructor_rating && (
                        <Badge variant="outline">
                          {course.instructor_rating.toFixed(1)}⭐ instructor
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}