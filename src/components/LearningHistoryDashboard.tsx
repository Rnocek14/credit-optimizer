import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  TrendingUp, 
  Target, 
  Calendar,
  Zap,
  Star
} from 'lucide-react';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { CourseProgressBadge } from './CourseProgressBadge';
import { format } from 'date-fns';
import { XP_REWARDS } from '@/lib/xpUtils';

export function LearningHistoryDashboard() {
  const {
    courseProgress,
    milestones,
    isLoading,
    getTotalCompletedCourses,
    getTotalXPFromCourses,
    getInProgressCourses,
    getCompletedCourses
  } = useCourseProgress();

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-48 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCompleted = getTotalCompletedCourses();
  const totalXP = getTotalXPFromCourses();
  const inProgressCourses = getInProgressCourses();
  const completedCourses = getCompletedCourses();
  const totalTimeSpent = courseProgress?.reduce((total, p) => total + p.time_spent_hours, 0) || 0;

  const stats = [
    {
      title: "Courses Completed",
      value: totalCompleted,
      icon: Trophy,
      color: "text-yellow-600"
    },
    {
      title: "XP from Learning",
      value: totalXP,
      icon: Zap,
      color: "text-blue-600"
    },
    {
      title: "Hours Invested",
      value: Math.round(totalTimeSpent * 10) / 10,
      icon: Clock,
      color: "text-green-600"
    },
    {
      title: "In Progress",
      value: inProgressCourses.length,
      icon: BookOpen,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Learning Progress Tabs */}
      <Tabs defaultValue="in-progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Courses in Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inProgressCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No courses in progress</p>
                  <p className="text-sm">Start learning a new course to see your progress here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inProgressCourses.map((progress) => (
                    <div key={progress.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                           <h4 className="font-medium">
                             {progress.title ? `${progress.title}${progress.platform ? ` (${progress.platform})` : ''}` : `Course ID: ${progress.course_id}`}
                           </h4>
                          <p className="text-sm text-muted-foreground">
                            Started {format(new Date(progress.started_at!), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <CourseProgressBadge progress={progress} />
                      </div>
                      <Progress value={progress.progress_percentage} className="h-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{progress.progress_percentage}% complete</span>
                        <span>{progress.time_spent_hours}h spent</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Completed Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed courses yet</p>
                  <p className="text-sm">Complete your first course to earn achievements!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedCourses.map((progress) => (
                    <div key={progress.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                           <h4 className="font-medium">
                             {progress.title ? `${progress.title}${progress.platform ? ` (${progress.platform})` : ''}` : `Course ID: ${progress.course_id}`}
                           </h4>
                          <p className="text-sm text-muted-foreground">
                            Completed {format(new Date(progress.completed_at!), 'MMM d, yyyy')}
                          </p>
                          {progress.completion_notes && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">
                              {progress.completion_notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="default" className="gap-1">
                            <Trophy className="h-3 w-3" />
                            +{XP_REWARDS.COURSE_COMPLETED} XP
                          </Badge>
                          <CourseProgressBadge progress={progress} showProgress={false} />
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Time invested: {progress.time_spent_hours} hours
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Learning Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!milestones || milestones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No milestones achieved yet</p>
                  <p className="text-sm">Complete courses to unlock learning milestones!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium capitalize">
                            {milestone.milestone_type.replace('_', ' ')}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(milestone.achieved_at), 'MMM d, yyyy - HH:mm')}
                          </p>
                          {milestone.milestone_data.completion_notes && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">
                              {milestone.milestone_data.completion_notes}
                            </p>
                          )}
                        </div>
                        <Badge variant="default" className="gap-1">
                          <Zap className="h-3 w-3" />
                          +{milestone.xp_awarded} XP
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}