import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScoringConfig } from '@/types/lifePathGraph';
import { Clock, DollarSign, BookOpen, TrendingUp, Target } from 'lucide-react';

interface PathfindingControlsProps {
  config: ScoringConfig;
  onChange: (config: ScoringConfig) => void;
}

export default function PathfindingControls({ config, onChange }: PathfindingControlsProps) {
  const updateObjectiveWeight = (objective: keyof ScoringConfig['objectives'], weight: number) => {
    onChange({
      ...config,
      objectives: {
        ...config.objectives,
        [objective]: {
          ...config.objectives[objective],
          weight: weight / 100
        }
      }
    });
  };

  const updateConstraint = (constraint: keyof ScoringConfig['constraints'], value: any) => {
    onChange({
      ...config,
      constraints: {
        ...config.constraints,
        [constraint]: value
      }
    });
  };

  const updateUserContext = (context: keyof ScoringConfig['userContext'], value: any) => {
    onChange({
      ...config,
      userContext: {
        ...config.userContext,
        [context]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Objective Weights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objective Priorities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Time ({Math.round(config.objectives.time.weight * 100)}%)
            </Label>
            <Slider
              value={[config.objectives.time.weight * 100]}
              onValueChange={([value]) => updateObjectiveWeight('time', value)}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4" />
              Cost ({Math.round(config.objectives.cost.weight * 100)}%)
            </Label>
            <Slider
              value={[config.objectives.cost.weight * 100]}
              onValueChange={([value]) => updateObjectiveWeight('cost', value)}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4" />
              Credit Loss ({Math.round(config.objectives.creditLoss.weight * 100)}%)
            </Label>
            <Slider
              value={[config.objectives.creditLoss.weight * 100]}
              onValueChange={([value]) => updateObjectiveWeight('creditLoss', value)}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4" />
              ROI ({Math.round(config.objectives.roi.weight * 100)}%)
            </Label>
            <Slider
              value={[config.objectives.roi.weight * 100]}
              onValueChange={([value]) => updateObjectiveWeight('roi', value)}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Constraints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Constraints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="maxCost" className="text-sm">Maximum Budget ($)</Label>
            <Input
              id="maxCost"
              type="number"
              value={config.constraints.maxCost || ''}
              onChange={(e) => updateConstraint('maxCost', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="No limit"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="maxTime" className="text-sm">Maximum Time (months)</Label>
            <Input
              id="maxTime"
              type="number"
              value={config.constraints.maxTime || ''}
              onChange={(e) => updateConstraint('maxTime', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="No limit"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* User Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Experience Level</Label>
            <Select 
              value={config.userContext.experienceLevel} 
              onValueChange={(value: any) => updateUserContext('experienceLevel', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Available Time</Label>
            <Select 
              value={config.userContext.availableTime} 
              onValueChange={(value: any) => updateUserContext('availableTime', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Risk Tolerance</Label>
            <Select 
              value={config.userContext.riskTolerance} 
              onValueChange={(value: any) => updateUserContext('riskTolerance', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Prefer proven paths</SelectItem>
                <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                <SelectItem value="high">High - Willing to try new paths</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}