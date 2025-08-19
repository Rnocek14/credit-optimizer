import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Clock, 
  TrendingUp, 
  BookOpen, 
  Award, 
  Zap, 
  BarChart3,
  CheckCircle,
  PlayCircle,
  Calendar,
  Brain
} from 'lucide-react';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { useAutonomousWorkflows } from '@/hooks/useAutonomousWorkflows';
import { TimelineProgressTracker } from '@/components/enhanced/TimelineProgressTracker';
import { WorkflowProgressTracker } from '@/components/WorkflowProgressTracker';
import type { CareerTrack } from '@/types/tracks';

interface TrackProgressAnalyticsProps {
  tracks: CareerTrack[];
  activeTrackId: string | null;
}

export function TrackProgressAnalytics({ tracks, activeTrackId }: TrackProgressAnalyticsProps) {
  const [selectedTrackId, setSelectedTrackId] = useState(activeTrackId || tracks[0]?.id || '');
  
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const { 
    courseProgress, 
    milestones, 
    isLoading: isProgressLoading,
    getTotalCompletedCourses,
    getTotalXPFromCourses,
    getInProgressCourses,
    getCompletedCourses
  } = useCourseProgress(selectedTrackId);
  
  const { 
    workflows, 
    loading: isWorkflowLoading,
    getActiveWorkflows,
    getCompletedWorkflows 
  } = useAutonomousWorkflows(selectedTrackId);

  if (!selectedTrack) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No tracks available</p>
      </div>
    );
  }

  const totalCourses = courseProgress?.length || 0;
  const completedCourses = getCompletedCourses()?.length || 0;
  const inProgressCourses = getInProgressCourses()?.length || 0;
  const totalXP = getTotalXPFromCourses() || 0;
  const activeWorkflows = getActiveWorkflows()?.length || 0;
  const completedWorkflows = getCompletedWorkflows()?.length || 0;
  
  const overallProgress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
  
  // Mock CRI data - in real implementation this would come from CRI calculation engine
  const criScore = 75 + Math.floor(Math.random() * 20);
  const globalCriScore = 68 + Math.floor(Math.random() * 15);
  
  // Mock timeline milestones
  const timelineMilestones = [
    {
      id: '1',
      title: 'Complete Foundation Courses',
      description: 'Master the basic concepts and tools',
      status: 'completed' as const,
      progress: 100,
      priority: 'high' as const,
      skills: ['JavaScript', 'HTML', 'CSS'],
      estimatedCompletion: '2024-02-15',
      actualCompletion: '2024-02-12',
      xpAwarded: 50
    },
    {
      id: '2', 
      title: 'Build First Portfolio Project',
      description: 'Create a complete web application',
      status: 'in_progress' as const,
      progress: 65,
      priority: 'high' as const,
      skills: ['React', 'Node.js', 'Database'],
      estimatedCompletion: '2024-03-01',
      xpAwarded: 0
    },
    {
      id: '3',
      title: 'Advanced Framework Mastery',
      description: 'Deep dive into modern frameworks',
      status: 'pending' as const,
      progress: 0,
      priority: 'medium' as const,
      skills: ['Next.js', 'TypeScript', 'Testing'],
      estimatedCompletion: '2024-04-15',
      xpAwarded: 0
    }
  ];

  const handleMilestoneAction = (milestoneId: string) => {
    console.log('Milestone action for:', milestoneId);
  };

  return (
    <div className="space-y-6">
      {/* Track Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Track Progress Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive progress tracking and insights for your career tracks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Track</label>
            <Select value={selectedTrackId} onValueChange={setSelectedTrackId}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {tracks.map(track => (
                  <SelectItem key={track.id} value={track.id} className="hover:bg-muted">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{track.icon || '💻'}</span>
                      {track.track_name || track.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{overallProgress}%</span>
                <Badge variant={overallProgress > 75 ? 'default' : overallProgress > 50 ? 'secondary' : 'outline'}>
                  {overallProgress > 75 ? 'Excellent' : overallProgress > 50 ? 'Good' : 'Getting Started'}
                </Badge>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {completedCourses} of {totalCourses} courses completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Career Readiness Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{criScore}</span>
                <Badge variant={criScore > globalCriScore ? 'default' : 'secondary'}>
                  {criScore > globalCriScore ? `+${criScore - globalCriScore}` : `${criScore - globalCriScore}`} vs Global
                </Badge>
              </div>
              <Progress value={criScore} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Track CRI vs Global Average ({globalCriScore})
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Experience Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{totalXP}</span>
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Track XP
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>This Track</span>
                  <span>{totalXP} XP</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Progress
          </CardTitle>
          <CardDescription>
            Track-specific learning progress and course completion status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Completed</span>
              </div>
              <p className="text-2xl font-bold">{completedCourses}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <PlayCircle className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">In Progress</span>
              </div>
              <p className="text-2xl font-bold">{inProgressCourses}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Total</span>
              </div>
              <p className="text-2xl font-bold">{totalCourses}</p>
            </div>
          </div>
          
          {isProgressLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading course progress...
            </div>
          ) : courseProgress && courseProgress.length > 0 ? (
            <div className="space-y-2">
              {courseProgress.slice(0, 5).map((course) => (
                <div key={course.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={course.status === 'completed' ? 'default' : course.status === 'in_progress' ? 'secondary' : 'outline'}>
                      {course.status.replace('_', ' ')}
                    </Badge>
                    <span className="font-medium">Course {course.course_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{course.progress_percentage}%</span>
                    <Progress value={course.progress_percentage || 0} className="w-20 h-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No course progress data for this track yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Autonomous Workflows
          </CardTitle>
          <CardDescription>
            AI-driven workflows and automated learning paths
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <PlayCircle className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Active</span>
              </div>
              <p className="text-2xl font-bold">{activeWorkflows}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Completed</span>
              </div>
              <p className="text-2xl font-bold">{completedWorkflows}</p>
            </div>
          </div>
          
          {isWorkflowLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading workflows...
            </div>
          ) : workflows && workflows.length > 0 ? (
            <div className="space-y-4">
              {workflows.slice(0, 3).map((workflow) => (
                <WorkflowProgressTracker key={workflow.id} workflow={workflow} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No autonomous workflows for this track yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Learning Timeline
          </CardTitle>
          <CardDescription>
            Track your progress through key learning milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineProgressTracker
            targetCareer={selectedTrack.track_name || selectedTrack.title || 'Career Track'}
            overallProgress={overallProgress}
            milestones={timelineMilestones}
            skillsAcquired={3}
            totalSkills={10}
            estimatedCompletion="2024-06-01"
            onMilestoneAction={handleMilestoneAction}
          />
        </CardContent>
      </Card>

      {/* Skills & Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Skills Acquired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">JavaScript</span>
                <Badge variant="default">Verified</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">React</span>
                <Badge variant="secondary">Learning</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">TypeScript</span>
                <Badge variant="outline">Planned</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Learning Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Courses per month</span>
                <span className="font-semibold">2.5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg. completion time</span>
                <span className="font-semibold">3.2 weeks</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Estimated track completion</span>
                <span className="font-semibold">6 months</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}