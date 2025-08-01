/**
 * Enhanced Smart Goal Setting Component
 * Integrates with AI-powered goal recommendations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, 
  TrendingUp, 
  Lightbulb, 
  Clock, 
  Award,
  CheckCircle,
  AlertCircle,
  Brain
} from 'lucide-react';
import { useEnhancedGoals } from '@/hooks/useEnhancedGoals';
import { useCRIGoals } from '@/hooks/useCRIGoals';

interface SmartGoalSettingProps {
  userId: string;
  currentCRI?: number;
}

export function SmartGoalSetting({ userId, currentCRI = 0 }: SmartGoalSettingProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target_role: '',
    target_date: '',
    skill_gaps: [] as string[]
  });

  const { targetCRI, updateGoal, isUpdating } = useCRIGoals(userId);
  
  const {
    goalRecommendations,
    userGoals,
    isLoadingRecommendations,
    isLoadingGoals,
    createGoal,
    isCreatingGoal,
    validateGoal,
    goalValidation,
    isValidatingGoal,
    calculateGoalProgress,
    getNextMilestone
  } = useEnhancedGoals(userId);

  const gap = Math.max(0, targetCRI - currentCRI);
  const progress = Math.min(100, (currentCRI / targetCRI) * 100);

  const handleCRIGoalChange = (value: string) => {
    updateGoal(parseInt(value));
  };

  const handleCreateGoal = () => {
    if (newGoal.title && newGoal.target_role) {
      createGoal(newGoal);
      setShowCreateForm(false);
      setNewGoal({
        title: '',
        description: '',
        target_role: '',
        target_date: '',
        skill_gaps: []
      });
    }
  };

  const handleValidateGoal = () => {
    validateGoal(newGoal);
  };

  const getGapMessage = () => {
    if (currentCRI >= targetCRI) {
      return `🎉 You've reached your CRI goal! Consider setting a higher target.`;
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
    <div className="space-y-6">
      {/* CRI Goal Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            CRI Goal Setting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Target CRI Score</Label>
            <Select 
              value={targetCRI.toString()} 
              onValueChange={handleCRIGoalChange}
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

      {/* AI Goal Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Goal Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRecommendations ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : goalRecommendations.length > 0 ? (
            <div className="space-y-4">
              {goalRecommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{rec.goal.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {rec.goal.description}
                      </p>
                    </div>
                    <Badge 
                      variant={rec.confidence_score > 0.8 ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {Math.round(rec.confidence_score * 100)}% match
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {rec.goal.estimated_timeline_weeks} weeks
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      ${rec.market_insights.avg_salary.toLocaleString()} avg salary
                    </div>
                    <Badge 
                      variant={rec.market_insights.demand_level === 'high' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {rec.market_insights.demand_level} demand
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground italic">
                    {rec.reasoning}
                  </p>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setNewGoal({
                        title: rec.goal.title || '',
                        description: rec.goal.description || '',
                        target_role: rec.goal.target_role || '',
                        target_date: new Date(Date.now() + (rec.goal.estimated_timeline_weeks || 12) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        skill_gaps: rec.goal.skill_gaps || []
                      });
                      setShowCreateForm(true);
                    }}
                  >
                    Set This Goal
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Analyzing your profile for goal recommendations...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              My Career Goals
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? "outline" : "default"}
            >
              {showCreateForm ? 'Cancel' : 'Create Goal'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="border rounded-lg p-4 mb-6 space-y-4">
              <h4 className="font-medium">Create New Goal</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Goal Title</Label>
                  <Input
                    value={newGoal.title}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Become a Full Stack Developer"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Target Role</Label>
                  <Input
                    value={newGoal.target_role}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_role: e.target.value }))}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your career goal and what you want to achieve..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
              
              {goalValidation && (
                <div className={`p-3 rounded-lg border ${
                  goalValidation.isValid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {goalValidation.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm font-medium">
                      {goalValidation.isValid ? 'Goal Validated' : 'Recommendations'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>Market Demand: {goalValidation.marketDemand}%</p>
                    <p>Feasibility: {goalValidation.feasibilityScore}%</p>
                    <p>Estimated Timeline: {goalValidation.estimatedTimeline} weeks</p>
                    {goalValidation.recommendations.map((rec, i) => (
                      <p key={i} className="text-muted-foreground">• {rec}</p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleValidateGoal}
                  disabled={isValidatingGoal || !newGoal.target_role}
                >
                  {isValidatingGoal ? 'Validating...' : 'Validate Goal'}
                </Button>
                <Button
                  onClick={handleCreateGoal}
                  disabled={isCreatingGoal || !newGoal.title || !newGoal.target_role}
                >
                  {isCreatingGoal ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </div>
          )}

          {isLoadingGoals ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : userGoals.length > 0 ? (
            <div className="space-y-4">
              {userGoals.map((goal) => {
                const progressPercent = calculateGoalProgress(goal);
                const nextMilestone = getNextMilestone(goal);
                
                return (
                  <div key={goal.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{goal.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Target: {goal.target_role}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {progressPercent}% complete
                      </Badge>
                    </div>
                    
                    <Progress value={progressPercent} className="h-2" />
                    
                    {nextMilestone && (
                      <div className="text-sm">
                        <span className="font-medium">Next: </span>
                        <span className="text-muted-foreground">{nextMilestone.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No goals set yet</p>
              <p className="text-sm">Create your first career goal to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}