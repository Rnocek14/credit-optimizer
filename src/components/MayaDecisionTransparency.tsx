import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Zap
} from 'lucide-react';

interface MayaDecisionTransparencyProps {
  decision: string;
  context: string;
  confidence?: number;
  showDetails?: boolean;
}

export function MayaDecisionTransparency({ 
  decision, 
  context, 
  confidence = 85,
  showDetails = false 
}: MayaDecisionTransparencyProps) {
  const { explainDecision, getResponseInsights, loading } = useEnhancedMaya();
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);

  const insights = getResponseInsights();

  const getConfidenceColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50';
    if (score >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 85) return <CheckCircle className="w-4 h-4" />;
    if (score >= 70) return <AlertTriangle className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  const handleExplainDecision = async () => {
    setIsGeneratingExplanation(true);
    try {
      const result = await explainDecision(`${decision} - Context: ${context}`);
      if (result?.response) {
        setExplanation(result.response);
      }
    } catch (error) {
      console.error('Error explaining decision:', error);
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Maya's Decision</CardTitle>
          </div>
          <Badge className={`flex items-center gap-1 ${getConfidenceColor(confidence)}`}>
            {getConfidenceIcon(confidence)}
            {confidence}% Confidence
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">{decision}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Decision Factors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-blue-800">Market Trend</p>
            <p className="text-sm font-bold text-blue-600">
              {insights?.marketHealthScore || 75}%
            </p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Target className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-green-800">Skill Match</p>
            <p className="text-sm font-bold text-green-600">
              {insights?.skillAlignment || 82}%
            </p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <Zap className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-purple-800">Your Streak</p>
            <p className="text-sm font-bold text-purple-600">
              {insights?.gamificationInfluence?.currentStreak || 0} days
            </p>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <Shield className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-orange-800">Risk Level</p>
            <p className="text-sm font-bold text-orange-600 capitalize">
              {insights?.riskLevel || 'Low'}
            </p>
          </div>
        </div>

        {/* Detailed Explanation Toggle */}
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              <span>Why Maya chose this</span>
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {isExpanded && (
            <div className="mt-4 space-y-4">
              {/* Decision Factors */}
              {insights?.primaryFactors && insights.primaryFactors.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Primary Decision Factors</h4>
                  <div className="space-y-2">
                    {insights.primaryFactors.map((factor, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gamification Influence */}
              {insights?.gamificationInfluence && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Your Learning Pattern Impact</h4>
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg text-sm">
                    <p>Your {insights.gamificationInfluence.currentStreak || 0}-day learning streak and 
                    {(insights.gamificationInfluence.streakMultiplier * 100 - 100) || 0}% XP multiplier 
                    influenced this recommendation by prioritizing consistent, engaging learning paths.</p>
                  </div>
                </div>
              )}

              {/* Expected Outcome */}
              <div>
                <h4 className="font-medium text-sm mb-2">Expected Outcome</h4>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="capitalize">{insights?.expectedSuccess || 'Positive'} results expected</span>
                </div>
              </div>

              {/* Generate AI Explanation */}
              {!explanation && (
                <Button
                  onClick={handleExplainDecision}
                  disabled={isGeneratingExplanation}
                  variant="outline"
                  className="w-full"
                >
                  {isGeneratingExplanation ? (
                    <>
                      <Brain className="w-4 h-4 mr-2 animate-pulse" />
                      Maya is thinking...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Get Detailed Explanation
                    </>
                  )}
                </Button>
              )}

              {/* AI Generated Explanation */}
              {explanation && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Maya's Detailed Reasoning</span>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}