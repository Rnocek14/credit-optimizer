import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Unlock, GraduationCap, Target, TrendingUp } from "lucide-react";
import { useAIPlanningEngine, type UnlockAnalysis } from "@/hooks/useAIPlanningEngine";

interface PlannerUnlockPreviewProps {
  userId?: string;
}

export function PlannerUnlockPreview({ userId }: PlannerUnlockPreviewProps) {
  const [unlockData, setUnlockData] = useState<UnlockAnalysis | null>(null);
  const { loading, analyzeUnlocks } = useAIPlanningEngine();

  useEffect(() => {
    if (userId) {
      loadUnlockAnalysis();
    } else {
      // Load demo data for Aisha Khan
      loadDemoUnlockAnalysis();
    }
  }, [userId]);

  const loadUnlockAnalysis = async () => {
    // For authenticated users, we could fetch their actual completed skills/courses
    // For now, using demo data
    const analysis = await analyzeUnlocks(
      ["Figma", "UX Fundamentals", "Responsive Design"],
      ["Introduction to UX Design"]
    );
    setUnlockData(analysis);
  };

  const loadDemoUnlockAnalysis = async () => {
    // Demo data for showcase
    const analysis = await analyzeUnlocks(
      ["Figma", "UX Fundamentals", "Responsive Design"],
      ["Introduction to UX Design"]
    );
    setUnlockData(analysis);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-primary" />
            Career Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!unlockData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-primary" />
            Career Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete some courses to see your progress analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalProgress = unlockData.summary.completedSkillsCount + unlockData.summary.completedCoursesCount;
  const progressPercentage = Math.min((totalProgress / 10) * 100, 100); // Assume 10 is a good milestone

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Unlock className="w-5 h-5 text-primary" />
          Your Career Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Learning Progress</span>
            <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-primary">
              {unlockData.summary.totalUnlocked}
            </div>
            <div className="text-xs text-muted-foreground">Unlocked Jobs</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">
              {unlockData.summary.totalPartial}
            </div>
            <div className="text-xs text-muted-foreground">Partially Qualified</div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span>Completed Skills</span>
            </div>
            <Badge variant="secondary">{unlockData.summary.completedSkillsCount}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span>Completed Courses</span>
            </div>
            <Badge variant="secondary">{unlockData.summary.completedCoursesCount}</Badge>
          </div>
        </div>

        {/* Next Steps */}
        {unlockData.recommendedCourses.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Recommended Next</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {unlockData.recommendedCourses.slice(0, 2).map(course => course.title).join(", ")}
              {unlockData.recommendedCourses.length > 2 && ` +${unlockData.recommendedCourses.length - 2} more`}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-xs text-muted-foreground p-2 bg-primary/5 rounded border border-primary/10">
          💡 <strong>Keep learning!</strong> Complete more courses to unlock new career opportunities.
        </div>
      </CardContent>
    </Card>
  );
}