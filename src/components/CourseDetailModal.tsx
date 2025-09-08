import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Clock, 
  DollarSign, 
  BookOpen, 
  GraduationCap, 
  TrendingUp,
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SaveButton from '@/components/SaveButton';

interface Course {
  id: string;
  title: string;
  platform: string;
  url?: string;
  difficulty?: string;
  cost?: string;
  description?: string;
  skill_tags?: string[];
  cri_score?: number;
  cri_breakdown?: {
    difficulty_score?: number;
    skill_coverage?: number;
    project_rigor?: number;
    outcome_conversion?: number;
    instructor_score?: number;
  };
  duration_hours?: number;
  instructor_name?: string;
  instructor_rating?: number;
  has_projects?: boolean;
  created_at?: string;
}

interface CourseDetailModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CourseDetailModal({ course, isOpen, onClose }: CourseDetailModalProps) {
  const { toast } = useToast();

  if (!course) return null;

  const handleStartCourse = () => {
    if (course.url) {
      window.open(course.url, '_blank');
    }
    toast({
      title: 'Course started',
      description: 'Opening course in new tab'
    });
  };

  const getCRIColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      case 'expert': return 'bg-primary-light text-primary';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{course.title}</DialogTitle>
              <DialogDescription className="text-base">
                Learn from {course.platform} • {course.instructor_name}
              </DialogDescription>
            </div>
            {course.cri_score && (
              <div className="text-center">
                <div className={`text-3xl font-bold ${getCRIColor(course.cri_score)}`}>
                  {Math.round(course.cri_score)}%
                </div>
                <div className="text-sm text-muted-foreground">CRI Score</div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Course Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {course.description || 'No description available.'}
                </p>
              </CardContent>
            </Card>

            {/* Skills You'll Learn */}
            {course.skill_tags && course.skill_tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Skills You'll Learn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {course.skill_tags.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CRI Breakdown */}
            {course.cri_breakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Course Quality Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(course.cri_breakdown).map(([key, value]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const score = typeof value === 'number' ? value : 0;
                    
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{label}</span>
                          <span className="font-medium">{Math.round(score)}%</span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Info */}
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {course.duration_hours ? `${course.duration_hours} hours` : 'Duration not specified'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {course.cost || 'Price not specified'}
                  </span>
                </div>

                {course.difficulty && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <Badge className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                  </div>
                )}

                {course.instructor_rating && (
                  <div className="flex items-center gap-3">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{course.instructor_rating}</span>
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      <span className="text-xs text-muted-foreground">Instructor Rating</span>
                    </div>
                  </div>
                )}

                {course.has_projects && (
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Includes hands-on projects</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <Button 
                  onClick={handleStartCourse} 
                  className="w-full" 
                  size="lg"
                  disabled={!course.url}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Start Course
                </Button>
                
                <SaveButton 
                  courseId={course.id}
                  variant="outline"
                  size="lg"
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Platform Info */}
            <Card>
              <CardHeader>
                <CardTitle>Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-lg font-semibold">{course.platform}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Trusted learning platform
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}