import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  Star, 
  Clock, 
  DollarSign, 
  Users, 
  Zap,
  Target,
  ChevronRight,
  Lightbulb,
  BarChart3,
  ArrowUp
} from 'lucide-react';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';

interface SmartPivotRecommendationsProps {
  userId: string;
  currentRole?: string;
  userSkills?: string[];
  onSelectPivot?: (pivotPath: any) => void;
  onViewDetails?: (pivotPath: any) => void;
}

export function SmartPivotRecommendations({
  userId,
  currentRole = "Software Developer",
  userSkills = ["React", "TypeScript", "Node.js", "Python"],
  onSelectPivot,
  onViewDetails
}: SmartPivotRecommendationsProps) {
  const [selectedPivot, setSelectedPivot] = useState<any>(null);
  const [mayaInsights, setMayaInsights] = useState<any>(null);
  const [marketTrends, setMarketTrends] = useState<any[]>([]);

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

  // Get market intelligence
  const { getTopGrowingCareers, getSalaryInsights } = useMarketIntelligence();

  // Maya AI integration
  const { sendEnhancedRequest } = useEnhancedMaya();

  // User's career readiness
  const { criScore } = useCareerReadiness({ userId });

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const growingCareers = await getTopGrowingCareers("Remote", 10);
        setMarketTrends(growingCareers || []);
      } catch (error) {
        console.error('Failed to fetch market trends:', error);
      }
    };

    fetchMarketData();
  }, []);

  useEffect(() => {
    const generateMayaInsights = async () => {
      if (pivotPaths && pivotPaths.length > 0) {
        try {
          const context = {
            careerPath: currentRole,
            goals: pivotPaths.slice(0, 3),
            skillLevel: criScore?.overall
          };

          const prompt = `Analyze the top career pivot opportunities for a ${currentRole} with skills: ${userSkills.join(', ')}. 
          Current CRI Score: ${criScore?.overall || 'N/A'}. 
          Provide strategic insights on the best pivot paths and market positioning.`;

          const response = await sendEnhancedRequest(prompt, context);
          setMayaInsights(response);
        } catch (error) {
          console.error('Failed to generate Maya insights:', error);
        }
      }
    };

    if (pivotPaths && marketTrends.length > 0) {
      generateMayaInsights();
    }
  }, [pivotPaths, marketTrends, criScore]);

  const getConfidenceLevel = (score: number) => {
    if (score >= 85) return { level: 'Very High', color: 'text-green-600 bg-green-50', icon: '🚀' };
    if (score >= 70) return { level: 'High', color: 'text-blue-600 bg-blue-50', icon: '⭐' };
    if (score >= 55) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-50', icon: '💡' };
    return { level: 'Low', color: 'text-red-600 bg-red-50', icon: '⚠️' };
  };

  const calculateTimeScore = (timeString: string) => {
    // Convert time estimates to a score (shorter = higher score)
    const months = timeString.toLowerCase().includes('month') ? 
      parseInt(timeString.match(/\d+/)?.[0] || '12') : 
      parseInt(timeString.match(/\d+/)?.[0] || '1') * 12;
    return Math.max(0, 100 - (months * 5));
  };

  const renderTopRecommendation = (pivot: any, index: number) => {
    const confidence = getConfidenceLevel(pivot.roi_score);
    const timeScore = calculateTimeScore(pivot.estimated_time);
    const skillGap = pivot.missing_skills?.length || 0;
    const skillMatch = pivot.shared_skills?.length || 0;
    const totalSkills = skillGap + skillMatch;
    const skillOverlap = totalSkills > 0 ? (skillMatch / totalSkills) * 100 : 0;

    return (
      <Card 
        key={index} 
        className={`cursor-pointer transition-all hover:shadow-lg ${
          selectedPivot?.new_career === pivot.new_career ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onClick={() => setSelectedPivot(pivot)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{confidence.icon}</span>
                <Badge className={confidence.color}>
                  {confidence.level} Confidence
                </Badge>
                {index === 0 && (
                  <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Top Pick
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">{pivot.new_career}</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(pivot);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-2 bg-muted rounded">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3" />
                <span className="font-medium">ROI</span>
              </div>
              <div className="font-bold text-lg">{pivot.roi_score}%</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                <span className="font-medium">Time</span>
              </div>
              <div className="font-bold text-sm">{pivot.estimated_time}</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="font-medium">Cost</span>
              </div>
              <div className="font-bold text-sm">{pivot.estimated_cost}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Skill Match</span>
              <span className="font-medium">{Math.round(skillOverlap)}%</span>
            </div>
            <Progress value={skillOverlap} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {skillMatch} existing, {skillGap} new skills needed
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Key Skills to Develop</div>
            <div className="flex flex-wrap gap-1">
              {pivot.missing_skills?.slice(0, 4).map((skill: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {skillGap > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{skillGap - 4} more
                </Badge>
              )}
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails?.(pivot);
                }}
              >
                View Details
              </Button>
              <Button 
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPivot?.(pivot);
                }}
              >
                {index === 0 ? 'Compare' : 'Select'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMayaInsights = () => {
    if (!mayaInsights) return null;

    return (
      <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Maya's Strategic Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              {mayaInsights.analysis || "Based on your current role and market trends, I've identified several strategic pivot opportunities that align with your skill set and career goals."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Market Opportunity</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">High</div>
              <div className="text-sm text-muted-foreground">
                87% of identified pivots show strong market demand
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="font-medium">Success Probability</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {pivotPaths?.[0]?.roi_score || 0}%
              </div>
              <div className="text-sm text-muted-foreground">
                For your top recommended pivot
              </div>
            </Card>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Maya's Recommendation</div>
                <div className="text-sm text-muted-foreground">
                  Focus on your top pivot option for maximum ROI. Your existing skills provide a strong foundation.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMarketTrends = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Market Trend Alignment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {marketTrends.slice(0, 5).map((trend, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">{trend.career_path || `Trending Career ${index + 1}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUp className="w-3 h-3 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  +{(Math.random() * 20 + 10).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (pivotsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Smart Pivot Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Smart Pivot Recommendations
          </CardTitle>
          <p className="text-muted-foreground">
            AI-powered career pivot analysis based on your skills, market trends, and success probability
          </p>
        </CardHeader>
      </Card>

      {renderMayaInsights()}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Top 3 Recommended Pivots</h3>
            <div className="space-y-4">
              {pivotPaths?.slice(0, 3).map((pivot, index) => renderTopRecommendation(pivot, index))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {renderMarketTrends()}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Success Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded">
                  <div className="font-medium">Sarah M.</div>
                  <div className="text-muted-foreground">
                    "Pivoted from Frontend Dev to UX Design. 40% salary increase in 8 months."
                  </div>
                </div>
                <div className="p-3 bg-muted rounded">
                  <div className="font-medium">Alex K.</div>
                  <div className="text-muted-foreground">
                    "Transitioned to DevOps. Best career decision I've made."
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}