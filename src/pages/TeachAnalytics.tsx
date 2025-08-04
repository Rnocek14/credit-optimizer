import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, BookOpen, Award, TrendingUp, Clock } from "lucide-react";
import { HubNavigation } from "@/components/HubNavigation";
import { useTeaching } from "@/hooks/useTeaching";

interface AnalyticsData {
  totalStudents: number;
  activeStudents: number;
  averageProgress: number;
  totalAssignments: number;
  enrollments: any[];
  assignments: any[];
}

export default function TeachAnalytics() {
  const { courses, loading } = useTeaching();
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);

  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.status === 'published').length;
  const totalEnrollments = analytics.reduce((sum, a) => sum + a.totalStudents, 0);
  const avgProgress = analytics.length > 0 
    ? Math.round(analytics.reduce((sum, a) => sum + a.averageProgress, 0) / analytics.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <HubNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Teaching Analytics</h1>
          <p className="text-muted-foreground">Monitor your teaching performance and student engagement</p>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                {publishedCourses} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEnrollments}</div>
              <p className="text-xs text-muted-foreground">
                across all courses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgProgress}%</div>
              <Progress value={avgProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{publishedCourses}</div>
              <p className="text-xs text-muted-foreground">
                currently running
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Course Performance */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance</CardTitle>
              <CardDescription>Track how your courses are performing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No courses available yet. Create your first course to see analytics.
                  </p>
                ) : (
                  courses.slice(0, 5).map((course) => (
                    <div key={course.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{course.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {course.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {course.enrollment_count} students
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{course.difficulty_level}</p>
                        <p className="text-xs text-muted-foreground">difficulty</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No recent activity. Start creating courses and assignments to see updates here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <Award className="h-4 w-4 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Course created: {course.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(course.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Teaching Insights</CardTitle>
            <CardDescription>Key metrics and recommendations for your teaching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">{totalCourses > 0 ? 'Active' : 'Getting Started'}</div>
                <p className="text-sm text-muted-foreground">
                  {totalCourses > 0 
                    ? `You have ${totalCourses} course${totalCourses === 1 ? '' : 's'} in your portfolio`
                    : 'Create your first course to start your teaching journey'
                  }
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {totalEnrollments > 0 ? `${Math.round(totalEnrollments / Math.max(publishedCourses, 1))}` : '0'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Average students per published course
                </p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {publishedCourses > 0 ? 'Growing' : 'Ready'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {publishedCourses > 0 
                    ? 'Your teaching portfolio is expanding'
                    : 'Ready to publish your first course'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}