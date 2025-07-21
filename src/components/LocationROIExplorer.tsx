import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, TrendingUp, Clock, Receipt } from 'lucide-react';

interface LocationROIExplorerProps {
  selectedCareerPathId: string | null;
  goalSkillIds: string[];
}

const LOCATIONS = [
  { value: 'united-states', label: 'United States', multiplier: 1.0, emoji: '🇺🇸' },
  { value: 'california', label: 'California', multiplier: 1.3, emoji: '🏖️' },
  { value: 'new-york', label: 'New York', multiplier: 1.2, emoji: '🗽' },
  { value: 'india', label: 'India', multiplier: 0.3, emoji: '🇮🇳' },
  { value: 'uk', label: 'United Kingdom', multiplier: 0.9, emoji: '🇬🇧' },
  { value: 'remote', label: 'Remote', multiplier: 1.1, emoji: '💻' }
];

export const LocationROIExplorer: React.FC<LocationROIExplorerProps> = ({
  selectedCareerPathId,
  goalSkillIds
}) => {
  // Fetch selected career path details
  const { data: careerPath } = useQuery({
    queryKey: ['career-path', selectedCareerPathId],
    queryFn: async () => {
      if (!selectedCareerPathId) return null;
      
      const { data, error } = await supabase
        .from('career_paths')
        .select('*')
        .eq('id', selectedCareerPathId)
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
    enabled: !!selectedCareerPathId
  });

  if (!careerPath) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Relocation ROI Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Select a career goal to compare ROI across locations
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate ROI data for all locations
  const currentSalary = 45000; // Demo starting salary
  const skillCount = goalSkillIds.length || 8;
  const avgCostPerSkill = 150;
  const totalCost = skillCount * avgCostPerSkill;
  const avgWeeksPerSkill = 3;
  const totalWeeks = skillCount * avgWeeksPerSkill;
  const totalMonths = Math.ceil(totalWeeks / 4);

  const locationROIData = LOCATIONS.map(location => {
    const adjustedSalary = Math.round((careerPath.average_salary || 78000) * location.multiplier);
    const uplift = adjustedSalary - currentSalary;
    const roi = uplift / totalCost;
    
    return {
      ...location,
      adjustedSalary,
      uplift,
      roi,
      totalCost,
      totalMonths
    };
  }).sort((a, b) => b.roi - a.roi); // Sort by ROI descending

  // Find top 2 ROI locations
  const topROILocations = locationROIData.slice(0, 2);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          🌍 Relocation ROI Explorer
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare {careerPath.title} earning potential across different locations
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locationROIData.map(location => {
            const isTopROI = topROILocations.some(top => top.value === location.value);
            
            return (
              <div
                key={location.value}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isTopROI 
                    ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' 
                    : 'border-border bg-card hover:shadow-md'
                }`}
              >
                {isTopROI && (
                  <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900">
                    🔥 Best ROI
                  </Badge>
                )}
                
                <div className="space-y-3">
                  {/* Location Header */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{location.emoji}</span>
                    <h3 className="font-semibold text-sm">{location.label}</h3>
                  </div>

                  {/* Adjusted Salary */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-muted-foreground">Salary</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      ${location.adjustedSalary.toLocaleString()}
                    </span>
                  </div>

                  {/* ROI Multiplier */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-muted-foreground">ROI</span>
                    </div>
                    <span className="text-sm font-bold text-purple-600">
                      {location.roi.toFixed(1)}× Return
                    </span>
                  </div>

                  {/* Total Cost */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Receipt className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Cost</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      ${location.totalCost.toLocaleString()}
                    </span>
                  </div>

                  {/* Time Estimate */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-orange-600" />
                      <span className="text-xs text-muted-foreground">Time</span>
                    </div>
                    <span className="text-sm font-medium text-orange-600">
                      {location.totalMonths} months
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Best ROI</p>
              <p className="font-semibold text-sm">
                {locationROIData[0]?.emoji} {locationROIData[0]?.label}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ROI Range</p>
              <p className="font-semibold text-sm">
                {locationROIData[locationROIData.length - 1]?.roi.toFixed(1)}× - {locationROIData[0]?.roi.toFixed(1)}×
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Skills in Path</p>
              <p className="font-semibold text-sm">{skillCount} skills</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};