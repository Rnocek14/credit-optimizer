import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star, Trophy, GraduationCap, Target, Plus, X } from 'lucide-react';
import { useTrackTranscript } from '@/hooks/useTrackTranscript';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  title: string;
  instructor?: string;
  difficulty?: number;
  cri_score?: number;
  completion_rate?: number;
  description?: string;
}

interface TrackTranscriptViewProps {
  courses?: Course[];
  className?: string;
}

export function TrackTranscriptView({ courses = [], className }: TrackTranscriptViewProps) {
  const { activeTrackId } = useActiveTrackStore();
  const { usage, tagCourse, untagCourse, isTagging, isUntagging, isAlreadyTagged } = useTrackTranscript(activeTrackId);
  const { toast } = useToast();
  const [newCourseId, setNewCourseId] = useState('');
  const [newCourseNotes, setNewCourseNotes] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Filter courses by track usage
  const trackCourses = courses.filter(course => 
    usage.some(u => u.course_id === course.id)
  );

  const getDifficultyStars = (difficulty?: number) => {
    if (!difficulty) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
      />
    ));
  };

  const getCRIBadgeColor = (score?: number) => {
    if (!score) return 'bg-muted';
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const handleAddCourse = async () => {
    if (!newCourseId.trim()) return;
    
    // Check for duplicates client-side to provide immediate feedback
    if (isAlreadyTagged(newCourseId)) {
      toast({
        title: 'Course already in track',
        description: 'This course is already added to your track transcript.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await tagCourse({ courseId: newCourseId, note: newCourseNotes });
      setNewCourseId('');
      setNewCourseNotes('');
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to add course:', error);
    }
  };

  const handleRemoveCourse = async (usageId: string) => {
    try {
      await untagCourse(usageId);
    } catch (error) {
      console.error('Failed to remove course:', error);
    }
  };

  if (!activeTrackId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Track Transcript
          </CardTitle>
          <CardDescription>
            Select a track to view your course transcript
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
            <GraduationCap className="h-5 w-5" />
            <CardTitle>Track Transcript</CardTitle>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Course to Track</DialogTitle>
                <DialogDescription>
                  Add a course to your track transcript with optional notes.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="courseId">Course ID</Label>
                  <Input
                    id="courseId"
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    placeholder="Enter course ID..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Progress Notes (optional)</Label>
                  <Input
                    id="notes"
                    value={newCourseNotes}
                    onChange={(e) => setNewCourseNotes(e.target.value)}
                    placeholder="Any notes about this course..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddCourse} 
                  disabled={isTagging || !newCourseId.trim() || isAlreadyTagged(newCourseId)}
                >
                  {isAlreadyTagged(newCourseId) ? 'Already in track' : 
                   isTagging ? 'Adding...' : 'Add Course'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Courses completed in this track with intelligence metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {trackCourses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No courses added to this track yet</p>
            <p className="text-sm">Add courses to build your track transcript</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trackCourses.map((course, index) => {
              const courseUsage = usage.find(u => u.course_id === course.id);
              
              return (
                <div key={course.id} className="relative">
                  {index > 0 && <Separator className="mb-4" />}
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-base">{course.title}</h3>
                          {course.instructor && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Instructor: {course.instructor}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCourse(courseUsage?.id || '')}
                          disabled={isUntagging || !courseUsage}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Intelligence Metrics */}
                      <div className="flex flex-wrap items-center gap-3">
                        {course.cri_score && (
                          <Badge 
                            variant="secondary" 
                            className={`text-white ${getCRIBadgeColor(course.cri_score)}`}
                          >
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
                      </div>

                      {/* Course Description */}
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                      )}

                      {/* Progress Notes */}
                      {courseUsage && (
                        <p className="text-xs text-muted-foreground">
                          Added to track transcript
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}