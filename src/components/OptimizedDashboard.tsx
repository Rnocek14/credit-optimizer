import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, BookOpen, TrendingUp, Brain, Award, BarChart3, 
  ChevronRight, Star, Clock, CheckCircle, ArrowUp, Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUserExperienceLevel } from "@/hooks/useUserExperienceLevel";
import { useUnifiedProgress } from "@/contexts/UnifiedDataContext";
import { useContextualRecommendations } from "@/contexts/UnifiedDataContext";

export default function OptimizedDashboard() {
  const { experienceLevel } = useUserExperienceLevel();
  const { data: progressData } = useUnifiedProgress();
  const recommendations = useContextualRecommendations();

  const quickActions = {
    beginner: [
      { label: "Set Your First Goal", href: "/goals", icon: Target, color: "bg-blue-500" },
      { label: "Explore Careers", href: "/explore", icon: BookOpen, color: "bg-green-500" },
      { label: "Take Assessment", href: "/onboarding", icon: BarChart3, color: "bg-purple-500" },
    ],
    intermediate: [
      { label: "View Skill Tree", href: "/skill-tree", icon: Target, color: "bg-blue-500" },
      { label: "Find Courses", href: "/explore-courses", icon: BookOpen, color: "bg-green-500" },
      { label: "Plan Career Path", href: "/planner", icon: TrendingUp, color: "bg-orange-500" },
      { label: "Maya Roadmap", href: "/maya-roadmap", icon: Brain, color: "bg-purple-500" },
    ],
    advanced: [
      { label: "Market Intelligence", href: "/market-intelligence", icon: TrendingUp, color: "bg-blue-500" },
      { label: "Salary Insights", href: "/salary-insights", icon: BarChart3, color: "bg-green-500" },
      { label: "Maya Automation", href: "/maya-automation", icon: Brain, color: "bg-purple-500" },
      { label: "CRI Dashboard", href: "/cri-dashboard", icon: Award, color: "bg-orange-500" },
    ]
  };

  const getCurrentQuickActions = () => quickActions[experienceLevel] || quickActions.beginner;

  // Mock data for demonstration
  const mockStats = {
    completedCourses: 12,
    activeGoals: 3,
    skillsProgress: 75,
    certificatesEarned: 4,
    weeklyStreak: 7
  };

  const recentActivity = [
    { type: "course", title: "Completed: React Advanced Patterns", time: "2 hours ago", status: "completed" },
    { type: "goal", title: "Updated goal: Senior Developer", time: "5 hours ago", status: "updated" },
    { type: "skill", title: "Gained XP in TypeScript", time: "1 day ago", status: "progress" },
    { type: "certificate", title: "Earned: React Developer Certificate", time: "2 days ago", status: "achieved" }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "course": return BookOpen;
      case "goal": return Target;
      case "skill": return Star;
      case "certificate": return Award;
      default: return CheckCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "achieved": return "text-purple-600";
      case "updated": return "text-blue-600";
      case "progress": return "text-orange-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">
            Ready to continue your {experienceLevel} learning journey?
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Zap className="h-4 w-4" />
          <span>{mockStats.weeklyStreak} day streak</span>
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Courses</p>
                <p className="text-2xl font-bold">{mockStats.completedCourses}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Goals</p>
                <p className="text-2xl font-bold">{mockStats.activeGoals}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{mockStats.skillsProgress}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Certificates</p>
                <p className="text-2xl font-bold">{mockStats.certificatesEarned}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>
              Actions tailored for your {experienceLevel} level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {getCurrentQuickActions().map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  asChild
                  variant="ghost"
                  className="w-full justify-start h-auto p-3"
                >
                  <Link to={action.href} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="flex-1 text-left">{action.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Progress & Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>Track your learning journey</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="progress" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="progress" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Skill Development</span>
                    <span className="text-sm text-muted-foreground">{mockStats.skillsProgress}%</span>
                  </div>
                  <Progress value={mockStats.skillsProgress} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Goal Achievement</span>
                    <span className="text-sm text-muted-foreground">67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Course Completion</span>
                    <span className="text-sm text-muted-foreground">89%</span>
                  </div>
                  <Progress value={89} className="h-2" />
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-3">
                {recentActivity.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Icon className={`h-4 w-4 ${getStatusColor(activity.status)}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Recommendations</span>
            </CardTitle>
            <CardDescription>
              Personalized suggestions based on your progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {recommendations.slice(0, 4).map((rec, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-medium">{rec.title || "Recommendation"}</h4>
                  <p className="text-sm text-muted-foreground">{rec.message}</p>
                  <Button size="sm" variant="outline" className="w-full">
                    {rec.action || "Learn More"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}