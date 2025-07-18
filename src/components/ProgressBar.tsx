import { Progress } from "@/components/ui/progress";
import { CheckCircle, Target } from "lucide-react";

interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-card border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Progress Overview</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>{completed} of {total} completed</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Completion Progress</span>
          <span className="font-medium">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
        
        {percentage >= 75 && (
          <p className="text-sm text-green-600 font-medium">
            🎉 You're almost there! Keep up the great work!
          </p>
        )}
        {percentage >= 50 && percentage < 75 && (
          <p className="text-sm text-blue-600 font-medium">
            💪 You're making great progress!
          </p>
        )}
        {percentage < 50 && percentage > 0 && (
          <p className="text-sm text-orange-600 font-medium">
            🚀 You've started your journey!
          </p>
        )}
        {percentage === 0 && (
          <p className="text-sm text-muted-foreground">
            Ready to begin? Start with your first step!
          </p>
        )}
      </div>
    </div>
  );
}