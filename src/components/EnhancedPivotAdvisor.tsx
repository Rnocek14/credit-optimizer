import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  DollarSign, 
  Brain, 
  BarChart3,
  ArrowRight,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';

interface EnhancedPivotAdvisorProps {
  userId: string;
  currentRole?: string;
  userSkills?: string[];
  onViewComparison?: (pivotPath: any) => void;
}

export function EnhancedPivotAdvisor({ 
  userId, 
  currentRole = "Software Developer",
  userSkills = ["React", "TypeScript", "Node.js", "Python"],
  onViewComparison 
}: EnhancedPivotAdvisorProps) {
  const [selectedPivot, setSelectedPivot] = useState<any>(null);
  const [analysisMode, setAnalysisMode] = useState<'overview' | 'detailed'>('overview');

  // Get CRI data for current user
  const { criScore, isLoading: criLoading } = useCareerReadiness({ userId });
  
  // Get pivot recommendations
  const { 
    data: pivotPaths, 
    isLoading: pivotsLoading 
  } = usePivotRecommendations({
    current_career: currentRole,
    user_skills: userSkills,
    preferred_locations: ["Remote", "San Francisco", "New York"],
    enabled: true
  });

  // Get market intelligence for current role
  const { 
    getTopGrowingCareers,
    getSalaryInsights,
    loading: marketLoading 
  } = useMarketIntelligence();

  // Maya AI insights
  const { sendEnhancedRequest } = useEnhancedMaya();

  const [marketData, setMarketData] = useState<any>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const growingCareers = await getTopGrowingCareers("Remote", 10);
        const salaryData = await getSalaryInsights(currentRole);
        setMarketData({ growingCareers, salaryData });
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchMarketData();
  }, [currentRole]);

  const isLoading = criLoading || pivotsLoading || marketLoading;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getROIColor = (roi: number) => {
    if (roi >= 80) return "text-green-600";
    if (roi >= 60) return "text-yellow-600";
    return "text-gray-600";
  };

  const renderPivotCard = (pivot: any, index: number) => {
    const confidence = pivot.roi_score / 100;
    const missingSkillsCount = pivot.missing_skills?.length || 0;
    const sharedSkillsCount = pivot.shared_skills?.length || 0;
    const skillOverlap = sharedSkillsCount / (sharedSkillsCount + missingSkillsCount) * 100;

    return (
      <Card key={index} className={`cursor-pointer transition-all hover:shadow-lg ${
        selectedPivot?.new_career === pivot.new_career ? 'ring-2 ring-primary' : ''
      }`} onClick={() => setSelectedPivot(pivot)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{pivot.new_career}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getConfidenceColor(confidence)}>
                  {Math.round(confidence * 100)}% Confidence
                </Badge>
                <Badge variant="outline">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  ROI: {pivot.roi_score}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => {
              e.stopPropagation();
              onViewComparison?.(pivot);
            }}>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{pivot.estimated_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className={`w-4 h-4 ${getROIColor(pivot.roi_score)}`} />
              <span>{pivot.estimated_cost}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Skill Overlap</span>
              <span>{Math.round(skillOverlap)}%</span>
            </div>
            <Progress value={skillOverlap} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Skills to Develop</div>
            <div className="flex flex-wrap gap-1">
              {pivot.missing_skills?.slice(0, 3).map((skill: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {missingSkillsCount > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{missingSkillsCount - 3} more
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDetailedAnalysis = () => {
    if (!selectedPivot) return null;

    const confidence = selectedPivot.roi_score / 100;
    const skillGap = selectedPivot.missing_skills?.length || 0;
    const currentCRI = criScore?.overall || 0;
    const projectedCRIGain = Math.round(confidence * 20); // Estimated CRI improvement

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Deep Analysis: {selectedPivot.new_career}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="font-medium">CRI Impact</span>
              </div>
              <div className="text-2xl font-bold">{currentCRI} → {currentCRI + projectedCRIGain}</div>
              <div className="text-sm text-muted-foreground">+{projectedCRIGain} points estimated</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-green-600" />
                <span className="font-medium">Market Demand</span>
              </div>
              <div className="text-2xl font-bold text-green-600">High</div>
              <div className="text-sm text-muted-foreground">Growing by 15% annually</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">Salary Range</span>
              </div>
              <div className="text-2xl font-bold">$120K+</div>
              <div className="text-sm text-muted-foreground">30% above current</div>
            </Card>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Maya's Reasoning</h4>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">{selectedPivot.reasoning}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Learning Roadmap Preview</h4>
              <div className="space-y-2">
                {selectedPivot.missing_skills?.slice(0, 5).map((skill: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-background rounded border">
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{skill}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {Math.floor(Math.random() * 8 + 2)} weeks
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => onViewComparison?.(selectedPivot)}
            >
              Compare Paths
            </Button>
            <Button 
              onClick={() => {
                // Navigate to planner with pivot data
                window.location.href = `/planner?pivot=${encodeURIComponent(JSON.stringify(selectedPivot))}`;
              }}
            >
              Generate Roadmap
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Enhanced Pivot Advisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Enhanced Pivot Advisor
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">
                Current: {currentRole}
              </Badge>
              <Badge variant="outline">
                CRI: {criScore?.overall || 0}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={analysisMode} onValueChange={(value) => setAnalysisMode(value as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Pivot Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {pivotPaths?.slice(0, 6).map((pivot, index) => renderPivotCard(pivot, index))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {selectedPivot ? renderDetailedAnalysis() : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Select a Pivot Option</h3>
                <p className="text-muted-foreground">Choose a career pivot from the overview to see detailed analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}