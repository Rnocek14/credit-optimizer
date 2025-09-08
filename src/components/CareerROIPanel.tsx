import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { getLocationMultiplier, getLocationLabel } from './LocationDropdown';

interface CareerROIPanelProps {
  selectedCareerPath: string | null;
  goalSkillIds: string[];
  selectedLocation: string;
}

export const CareerROIPanel: React.FC<CareerROIPanelProps> = ({
  selectedCareerPath,
  goalSkillIds,
  selectedLocation
}) => {
  // Fetch selected career path details
  const { data: careerPath } = useQuery({
    queryKey: ['career-path', selectedCareerPath],
    queryFn: async () => {
      if (!selectedCareerPath) return null;
      
      const { data, error } = await supabase
        .from('career_paths')
        .select('*')
        .eq('id', selectedCareerPath)
        .single();
      
      if (error) {
        console.error('Career path fetch error:', error);
        // Return mock data for UX Designer
        return {
          id: 'ux-designer',
          title: 'UX Designer',
          average_salary: 78000,
          industry: 'Design',
          level: 'Entry'
        };
      }
      
      return data;
    },
    enabled: !!selectedCareerPath
  });

  // Mock current user salary for ROI calculation
  const currentSalary = 45000; // Demo starting salary

  if (!careerPath) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Career ROI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Select a career goal to see ROI analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate mock costs and time estimates
  const skillCount = goalSkillIds.length || 8; // Default to 8 skills for demo
  const avgCostPerSkill = 150; // Average course cost
  const totalCost = skillCount * avgCostPerSkill;
  const avgWeeksPerSkill = 3;
  const totalWeeks = skillCount * avgWeeksPerSkill;
  const totalMonths = Math.ceil(totalWeeks / 4);

  // Calculate ROI with location adjustment
  const locationMultiplier = getLocationMultiplier(selectedLocation);
  const adjustedSalary = Math.round((careerPath.average_salary || 78000) * locationMultiplier);
  const salaryUplift = adjustedSalary - currentSalary;
  const roiMultiplier = salaryUplift / totalCost;
  
  // Calculate adjustment percentage for display
  const adjustmentPercentage = Math.round((locationMultiplier - 1) * 100);
  const locationLabel = getLocationLabel(selectedLocation);

  return (
    <Card className="w-80 sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Career ROI Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Career Title */}
        <div>
          <h3 className="font-semibold text-base">{careerPath.title}</h3>
          <Badge variant="secondary" className="text-ui-small">
            {careerPath.industry} • {careerPath.level}
          </Badge>
        </div>

        {/* Salary Uplift */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Salary Uplift</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-green-600">
              +${salaryUplift.toLocaleString()}
            </span>
            {adjustmentPercentage !== 0 && (
              <div className="text-xs text-green-700">
                Adjusted for {locationLabel}: {adjustmentPercentage > 0 ? '+' : ''}{adjustmentPercentage}%
              </div>
            )}
          </div>
        </div>

        {/* Total Cost */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Total Cost</span>
          </div>
          <span className="font-bold text-blue-600">
            ${totalCost.toLocaleString()}
          </span>
        </div>

        {/* Time Estimate */}
        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Time Estimate</span>
          </div>
          <span className="font-bold text-orange-600">
            {totalMonths} months
          </span>
        </div>

        {/* ROI Score */}
        <div className="flex items-center justify-between p-3 bg-primary-light rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-ui-label">ROI Score</span>
          </div>
          <span className="font-bold text-primary">
            {roiMultiplier.toFixed(1)}× Return
          </span>
        </div>

        {/* Skills Summary */}
        <div className="pt-2 border-t">
          <p className="text-ui-small text-muted-foreground">
            {skillCount} skills in learning path • Based on {locationLabel} averages
          </p>
        </div>
      </CardContent>
    </Card>
  );
};