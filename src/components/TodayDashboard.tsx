import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, TrendingUp, Zap, Star, Calendar, 
  CheckCircle, ArrowRight, Flame, Brain
} from "lucide-react";
import { Link } from "react-router-dom";
import { UnifiedRecommendation } from "@/types/recommendations";

interface TodayDashboardProps {
  onNextStepClick?: () => void;
  nextStepData?: UnifiedRecommendation;
}

export function TodayDashboard({ onNextStepClick, nextStepData }: TodayDashboardProps) {
  // Use recommendation data if available, otherwise fallback to mock data
  const todayData = {
    nextStep: nextStepData ? {
      title: nextStepData.title,
      description: nextStepData.description,
      progress: nextStepData.progress || 0,
      timeEstimate: nextStepData.timeEstimate || "2 hours",
      difficulty: nextStepData.priority === 'critical' ? 'High' : 
                  nextStepData.priority === 'high' ? 'Medium' : 'Low'
    } : {
      title: "Complete Python Pandas Module",
      description: "Data manipulation essentials for your Data Scientist journey",
      progress: 65,
      timeEstimate: "2 hours",
      difficulty: "Intermediate"
    },
    focusSkills: [
      { name: "Python", progress: 75, priority: "high" },
      { name: "Statistics", progress: 45, priority: "medium" },
      { name: "Data Visualization", progress: 30, priority: "high" }
    ],
    quickWins: [
      { 
        title: "Review yesterday's notes", 
        timeEstimate: "10 min",
        type: "review",
        href: "/progress?tab=history"
      },
      { 
        title: "Practice SQL queries", 
        timeEstimate: "15 min",
        type: "practice",
        href: "/discover?tab=courses"
      },
      { 
        title: "Update LinkedIn profile", 
        timeEstimate: "5 min",
        type: "action",
        href: "/progress?tab=resume"
      }
    ],
    streakData: {
      currentStreak: 7,
      totalXP: 1240,
      todayXP: 85,
      level: 5
    }
  };

  const handleNextStepClick = () => {
    if (onNextStepClick) {
      onNextStepClick();
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Today's Focus</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Calendar className="h-3 w-3" />
          Day {todayData.streakData.currentStreak}
        </Badge>
      </div>

      {/* Today Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Next Step Card */}
        <Card className="md:col-span-2">
          <div data-testid="today-next-step">{/* Content wrapper for test ID */}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Next Step
              </CardTitle>
              <Badge variant="secondary">{todayData.nextStep.difficulty}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-medium text-sm">{todayData.nextStep.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {todayData.nextStep.description}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{todayData.nextStep.progress}%</span>
              </div>
              <Progress value={todayData.nextStep.progress} className="h-1.5" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                ~{todayData.nextStep.timeEstimate}
              </span>
              <Button 
                size="sm" 
                onClick={handleNextStepClick}
                data-testid="today-next-step"
                className="text-xs px-3 py-1 h-7"
              >
                Continue
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
          </div>
        </Card>

        {/* Focus Skills Card */}
        <Card data-testid="today-focus-skills">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              Focus Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayData.focusSkills.slice(0, 3).map((skill, index) => (
              <div key={skill.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    {skill.name}
                    {skill.priority === "high" && (
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    )}
                  </span>
                  <span>{skill.progress}%</span>
                </div>
                <Progress value={skill.progress} className="h-1" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Wins Card */}
        <Card data-testid="today-quick-wins">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayData.quickWins.map((win, index) => (
              <Button
                key={index}
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-start h-auto p-2 text-left"
              >
                <Link to={win.href}>
                  <div className="flex-1">
                    <div className="text-xs font-medium">{win.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {win.timeEstimate}
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Streak/XP Card */}
        <Card data-testid="today-streak">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-600" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Streak</span>
                <span className="font-bold">{todayData.streakData.currentStreak} days</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Level</span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {todayData.streakData.level}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Today XP</span>
                <span className="text-green-600">+{todayData.streakData.todayXP}</span>
              </div>
              <div className="pt-1 border-t">
                <div className="flex justify-between text-xs font-medium">
                  <span>Total XP</span>
                  <span>{todayData.streakData.totalXP.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}