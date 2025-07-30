/**
 * CRI Goal Setting Component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp } from 'lucide-react';
import { useCRIGoals } from '@/hooks/useCRIGoals';

interface CRIGoalSettingProps {
  userId: string;
  currentCRI?: number;
}

export function CRIGoalSetting({ userId, currentCRI = 0 }: CRIGoalSettingProps) {
  const { targetCRI, updateGoal, isUpdating } = useCRIGoals(userId);

  const handleGoalChange = (value: string) => {
    updateGoal(parseInt(value));
  };

  const gap = Math.max(0, targetCRI - currentCRI);
  const progress = Math.min(100, (currentCRI / targetCRI) * 100);

  const getGapMessage = () => {
    if (currentCRI >= targetCRI) {
      return `🎉 You've reached your goal! Consider setting a higher target.`;
    }
    if (gap <= 5) {
      return `🔥 Almost there! You're only ${gap} points away from your goal.`;
    }
    if (gap <= 15) {
      return `💪 Great progress! You're ${gap} points away from your target.`;
    }
    return `🚀 You're ${gap} points away from your goal. Keep building those skills!`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          CRI Goal Setting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Target CRI Score</label>
          <Select 
            value={targetCRI.toString()} 
            onValueChange={handleGoalChange}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your target CRI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">60 - Getting Started</SelectItem>
              <SelectItem value="70">70 - Good Progress</SelectItem>
              <SelectItem value="80">80 - Career Ready</SelectItem>
              <SelectItem value="90">90 - Highly Qualified</SelectItem>
              <SelectItem value="100">100 - Expert Level</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Progress Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress to Goal</span>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {currentCRI}/{targetCRI}
            </Badge>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <p className="text-sm text-muted-foreground">
            {getGapMessage()}
          </p>
        </div>

        {/* Motivational Messages */}
        {currentCRI >= targetCRI && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              🏆 Congratulations! You've achieved your CRI goal. 
              Consider setting a higher target to continue growing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}