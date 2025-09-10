import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Clock, 
  DollarSign, 
  GraduationCap, 
  Target, 
  Award,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { EduCourse, AltCreditOption } from '@/lib/types/eduTree';

interface EduCourseDetailModalProps {
  course: EduCourse | null;
  isOpen: boolean;
  onClose: () => void;
  equivalencies?: AltCreditOption[];
  isCompleted?: boolean;
  onMarkComplete?: (courseId: string) => void;
  onSelectAlternative?: (option: AltCreditOption) => void;
}

export function EduCourseDetailModal({ 
  course, 
  isOpen, 
  onClose, 
  equivalencies = [],
  isCompleted = false,
  onMarkComplete,
  onSelectAlternative 
}: EduCourseDetailModalProps) {
  if (!course) return null;

  const getDifficultyInfo = (levelYear: number) => {
    if (levelYear <= 1) return { 
      label: 'Foundation Level', 
      color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      description: 'Introductory concepts and basic skills'
    };
    if (levelYear <= 2) return { 
      label: 'Intermediate Level', 
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
      description: 'Building on foundational knowledge'
    };
    return { 
      label: 'Advanced Level', 
      color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
      description: 'Complex concepts and specialized skills'
    };
  };

  const difficulty = getDifficultyInfo(course.level_year);

  const getProviderColor = (provider: string) => {
    const colors = {
      'coursera': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      'udemy': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
      'edx': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
      'youtube': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
      'masterclass': 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
    };
    return colors[provider.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200';
  };

  const estimatedHours = Math.max(12, course.credits * 15); // Rough estimate: 15 hours per credit

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <DialogTitle className="text-xl">{course.title}</DialogTitle>
                {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
              </div>
              <DialogDescription className="flex items-center gap-2 text-sm">
                <span className="font-mono">{course.code}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{course.credits} credits</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="capitalize">{course.area.replace('_', ' ')}</span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Badge className={`${difficulty.color}`}>
                {difficulty.label}
              </Badge>
              {course.is_core && (
                <Badge variant="default">Core Requirement</Badge>
              )}
              {course.is_capstone && (
                <Badge variant="destructive">Capstone</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="outcomes">Learning Outcomes</TabsTrigger>
            <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Course Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {course.description ? (
                      <p className="text-sm leading-relaxed">{course.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Course description not available. This is a standard course in the {course.area.replace('_', ' ')} area.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Course Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{course.credits} Credits</p>
                        <p className="text-xs text-muted-foreground">Standard credits</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">~{estimatedHours} Hours</p>
                        <p className="text-xs text-muted-foreground">Estimated time</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{difficulty.label}</p>
                        <p className="text-xs text-muted-foreground">{difficulty.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Year {course.level_year}</p>
                        <p className="text-xs text-muted-foreground">Academic level</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="outcomes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Learning Outcomes
                  </CardTitle>
                  <CardDescription>
                    What you'll learn and skills you'll develop in this course
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {course.learning_outcomes && course.learning_outcomes.length > 0 ? (
                    <div className="space-y-3">
                      {course.learning_outcomes.map((outcome, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-sm leading-relaxed">{outcome}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Learning outcomes not specified for this course.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This course follows standard {course.area.replace('_', ' ')} curriculum guidelines.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alternatives" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Alternative Credit Options</CardTitle>
                  <CardDescription>
                    Earn equivalent credit through alternative providers and pathways
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {equivalencies.length > 0 ? (
                    <div className="space-y-4">
                      {equivalencies.map((option, index) => (
                        <Card key={index} className="border-dashed">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getProviderColor(option.provider)}>
                                    {option.provider}
                                  </Badge>
                                  {option.proctoring_required && (
                                    <Badge variant="outline" className="text-xs">
                                      Proctored
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-medium text-sm mb-1">
                                  {option.provider_course_name}
                                </h4>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {option.estimated_hours && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {option.estimated_hours} hours
                                    </div>
                                  )}
                                  {option.cost_estimate && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <DollarSign className="h-3 w-3" />
                                      ${option.cost_estimate}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onSelectAlternative?.(option)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Learn More
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No alternative credit options available for this course.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="planning" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Progress Tracking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Completion Status</span>
                        <span className="text-sm font-medium">
                          {isCompleted ? '100%' : '0%'}
                        </span>
                      </div>
                      <Progress value={isCompleted ? 100 : 0} className="h-2" />
                    </div>
                    
                    {!isCompleted && onMarkComplete && (
                      <Button 
                        onClick={() => onMarkComplete(course.id)}
                        className="w-full"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Complete
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time Investment</span>
                      <span className="font-medium">{estimatedHours} hours</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Academic Level</span>
                      <span className="font-medium">Year {course.level_year}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Course Type</span>
                      <span className="font-medium">
                        {course.is_core ? 'Core' : 'Elective'}
                      </span>
                    </div>
                    {equivalencies.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Alternatives</span>
                        <span className="font-medium text-primary">
                          {equivalencies.length} available
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}