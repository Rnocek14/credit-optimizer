import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, Target, Brain, Activity, Zap, CheckCircle, 
  Clock, Star, ArrowRight, Calendar
} from 'lucide-react';

interface Phase4OverviewProps {
  userId: string;
  sharedState: any;
  onNavigate: (tab: string) => void;
}

export function Phase4Overview({ userId, sharedState, onNavigate }: Phase4OverviewProps) {
  const overallProgress = 72;
  const activePivots = 2;
  const completedMilestones = 8;
  const skillsAcquired = 12;
  const workflowsActive = 5;

  const quickStats = [
    {
      label: 'Career Progress',
      value: `${overallProgress}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Active Pivots',
      value: activePivots,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Skills Acquired',
      value: skillsAcquired,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      label: 'AI Workflows',
      value: workflowsActive,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const recentActivity = [
    {
      type: 'milestone',
      title: 'Completed Product Strategy Module',
      time: '2 hours ago',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      type: 'pivot',
      title: 'New AI/ML Engineer path discovered',
      time: '4 hours ago',
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      type: 'workflow',
      title: 'Resume analysis completed',
      time: '6 hours ago',
      icon: Activity,
      color: 'text-purple-600'
    }
  ];

  const upcomingTasks = [
    {
      title: 'Complete Analytics Deep Dive',
      dueDate: 'Today',
      priority: 'high',
      category: 'Learning'
    },
    {
      title: 'Review Market Intelligence Report',
      dueDate: 'Tomorrow',
      priority: 'medium',
      category: 'Research'
    },
    {
      title: 'Update LinkedIn Profile',
      dueDate: 'This Week',
      priority: 'low',
      category: 'Networking'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome to Phase 4</h2>
              <p className="text-sm text-muted-foreground">
                Your AI-powered career transition command center
              </p>
            </div>
            <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/30">
              Co-Pilot Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Career Progress</span>
              <span className="text-sm text-muted-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground">
            You're making excellent progress! Maya has identified 3 new optimization opportunities.
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-lg font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Icon className={`w-4 h-4 ${activity.color}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{activity.title}</div>
                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                  </div>
                </div>
              );
            })}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => onNavigate('tracker')}
            >
              View All Activity
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="text-sm font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground">{task.category} • Due {task.dueDate}</div>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    task.priority === 'high' ? 'border-red-300 text-red-700' :
                    task.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                    'border-gray-300 text-gray-700'
                  }
                >
                  {task.priority}
                </Badge>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => onNavigate('workflows')}
            >
              Manage Tasks
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => onNavigate('copilot')}
            >
              <Brain className="w-5 h-5" />
              <span className="text-sm">AI Co-Pilot</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => onNavigate('pivot')}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Explore Pivots</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => onNavigate('tracker')}
            >
              <Target className="w-5 h-5" />
              <span className="text-sm">Track Progress</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => onNavigate('workflows')}
            >
              <Zap className="w-5 h-5" />
              <span className="text-sm">AI Workflows</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}