import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, DollarSign, TrendingUp, Clock, Receipt, Lightbulb, Briefcase, Globe } from 'lucide-react';

interface LocationROIExplorerProps {
  selectedCareerPathId: string | null;
  goalSkillIds: string[];
}

const LOCATIONS = [
  { 
    value: 'united-states', 
    label: 'United States', 
    multiplier: 1.0, 
    emoji: '🇺🇸',
    costOfLiving: 1.0,
    jobMarket: 'High',
    jobIcon: '🔥',
    visaEligible: { india: true, uk: true, remote: true }
  },
  { 
    value: 'california', 
    label: 'California', 
    multiplier: 1.3, 
    emoji: '🏖️',
    costOfLiving: 1.4,
    jobMarket: 'High',
    jobIcon: '🔥',
    visaEligible: { india: false, uk: true, remote: true }
  },
  { 
    value: 'new-york', 
    label: 'New York', 
    multiplier: 1.2, 
    emoji: '🗽',
    costOfLiving: 1.35,
    jobMarket: 'High',
    jobIcon: '🔥',
    visaEligible: { india: false, uk: true, remote: true }
  },
  { 
    value: 'india', 
    label: 'India', 
    multiplier: 0.3, 
    emoji: '🇮🇳',
    costOfLiving: 0.35,
    jobMarket: 'Medium',
    jobIcon: '⚠️',
    visaEligible: { india: true, uk: true, remote: true }
  },
  { 
    value: 'uk', 
    label: 'United Kingdom', 
    multiplier: 0.9, 
    emoji: '🇬🇧',
    costOfLiving: 1.1,
    jobMarket: 'Medium',
    jobIcon: '⚠️',
    visaEligible: { india: true, uk: true, remote: true }
  },
  { 
    value: 'remote', 
    label: 'Remote', 
    multiplier: 1.1, 
    emoji: '💻',
    costOfLiving: 0.8,
    jobMarket: 'Low',
    jobIcon: '❄️',
    visaEligible: { india: true, uk: true, remote: true }
  }
];

export const LocationROIExplorer: React.FC<LocationROIExplorerProps> = ({
  selectedCareerPathId,
  goalSkillIds
}) => {
  const [showVisaEligibility, setShowVisaEligibility] = useState(false);
  const [sortBy, setSortBy] = useState<'roi' | 'colAdjustedRoi' | 'jobMarket' | 'lqi'>('roi');
  
  // Mock current user region for visa calculations
  const currentUserRegion = 'india';
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
    const colAdjustedROI = uplift / (totalCost * location.costOfLiving);
    const isVisaEligible = location.visaEligible[currentUserRegion as keyof typeof location.visaEligible];
    
    // Calculate LQI components
    const roiScore = roi;
    const colScore = 100 - (location.costOfLiving * 100);
    const jobMarketScore = location.jobMarket === 'High' ? 100 : location.jobMarket === 'Medium' ? 65 : 30;
    const visaScore = isVisaEligible ? 100 : 30;
    
    // LQI formula: (ROI × 0.4) + (COL Score × 0.25) + (Job Market Score × 0.25) + (Visa Score × 0.10)
    const lqi = (roiScore * 0.4) + (colScore * 0.25) + (jobMarketScore * 0.25) + (visaScore * 0.10);
    
    return {
      ...location,
      adjustedSalary,
      uplift,
      roi,
      colAdjustedROI,
      totalCost,
      totalMonths,
      isVisaEligible,
      lqi,
      roiScore,
      colScore,
      jobMarketScore,
      visaScore
    };
  }).sort((a, b) => {
    if (sortBy === 'lqi') return b.lqi - a.lqi;
    if (sortBy === 'colAdjustedRoi') return b.colAdjustedROI - a.colAdjustedROI;
    if (sortBy === 'jobMarket') {
      const jobMarketOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      return jobMarketOrder[b.jobMarket as keyof typeof jobMarketOrder] - jobMarketOrder[a.jobMarket as keyof typeof jobMarketOrder];
    }
    return b.roi - a.roi; // Default ROI sort
  });

  // Find top locations for different metrics
  const topROILocations = [...locationROIData].sort((a, b) => b.roi - a.roi).slice(0, 2);
  const topCOLROILocations = [...locationROIData].sort((a, b) => b.colAdjustedROI - a.colAdjustedROI).slice(0, 2);
  const topLQILocation = [...locationROIData].sort((a, b) => b.lqi - a.lqi)[0];
  const lqiRange = {
    min: Math.min(...locationROIData.map(l => l.lqi)),
    max: Math.max(...locationROIData.map(l => l.lqi))
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            🌍 Relocation ROI Explorer
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare {careerPath.title} earning potential across different locations
          </p>
          
          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                id="visa-toggle"
                checked={showVisaEligibility}
                onCheckedChange={setShowVisaEligibility}
              />
              <Label htmlFor="visa-toggle" className="text-sm">Show Visa Eligibility</Label>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('roi')}
                className={`px-3 py-1 text-xs rounded ${sortBy === 'roi' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                Sort by ROI
              </button>
              <button
                onClick={() => setSortBy('colAdjustedRoi')}
                className={`px-3 py-1 text-xs rounded ${sortBy === 'colAdjustedRoi' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                Sort by Net ROI
              </button>
              <button
                onClick={() => setSortBy('jobMarket')}
                className={`px-3 py-1 text-xs rounded ${sortBy === 'jobMarket' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                Sort by Jobs
              </button>
              <button
                onClick={() => setSortBy('lqi')}
                className={`px-3 py-1 text-xs rounded ${sortBy === 'lqi' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                Sort by LQI
              </button>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locationROIData.map(location => {
            const isTopROI = topROILocations.some(top => top.value === location.value);
            const isTopCOLROI = topCOLROILocations.some(top => top.value === location.value);
            
            return (
              <div
                key={location.value}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isTopROI 
                    ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' 
                    : 'border-border bg-card hover:shadow-md'
                }`}
              >
                {/* Badges */}
                <div className="absolute -top-2 -right-2 flex flex-col gap-1">
                  {isTopROI && (
                    <Badge className="bg-yellow-500 text-yellow-900">
                      🔥 Best ROI
                    </Badge>
                  )}
                  {isTopCOLROI && !isTopROI && (
                    <Badge className="bg-blue-500 text-blue-100">
                      💡 Best COL-Adjusted ROI
                    </Badge>
                  )}
                </div>
                
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

                  {/* COL-Adjusted ROI */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lightbulb className="h-3 w-3 text-cyan-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>ROI adjusted for cost of living ({(location.costOfLiving * 100).toFixed(0)}% of US baseline)</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs text-muted-foreground">Net ROI (Cost-Adjusted)</span>
                    </div>
                    <span className="text-sm font-bold text-cyan-600">
                      {location.colAdjustedROI.toFixed(1)}× Return
                    </span>
                  </div>

                  {/* LQI Score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs cursor-help">🏆</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">LQI Breakdown:</p>
                          <p>ROI {location.roiScore.toFixed(1)}× | COL {location.colScore.toFixed(0)} | Job {location.jobMarketScore} | Visa {location.visaScore}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs text-muted-foreground">LQI</span>
                    </div>
                    <span className="text-sm font-bold text-amber-600">
                      {location.lqi.toFixed(1)}
                    </span>
                  </div>

                  {/* Job Availability */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-indigo-600" />
                      <span className="text-xs text-muted-foreground">Job Availability</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{location.jobIcon}</span>
                      <span className="text-sm font-medium text-indigo-600">{location.jobMarket}</span>
                    </div>
                  </div>

                  {/* Visa Status (conditional) */}
                  {showVisaEligibility && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-slate-600" />
                        <span className="text-xs text-muted-foreground">Visa Status</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm">
                              {location.isVisaEligible ? '✅' : '❌'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{location.isVisaEligible ? 'Visa eligible from India' : 'Visa restrictions apply'}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-sm font-medium text-slate-600">
                          {location.isVisaEligible ? 'Eligible' : 'Restricted'}
                        </span>
                      </div>
                    </div>
                  )}

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
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Top LQI Region</p>
              <p className="font-semibold text-sm">
                🌍 {topLQILocation?.emoji} {topLQILocation?.label} (LQI {topLQILocation?.lqi.toFixed(1)})
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">LQI Range</p>
              <p className="font-semibold text-sm">
                {lqiRange.min.toFixed(1)} – {lqiRange.max.toFixed(1)}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Best ROI</p>
              <p className="font-semibold text-sm">
                {topROILocations[0]?.emoji} {topROILocations[0]?.label}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best Net ROI</p>
              <p className="font-semibold text-sm">
                {topCOLROILocations[0]?.emoji} {topCOLROILocations[0]?.label}
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
          <p className="text-xs text-muted-foreground text-center mt-4">
            *LQI combines ROI, cost of living, job market, and visa factors for comprehensive ranking
          </p>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};