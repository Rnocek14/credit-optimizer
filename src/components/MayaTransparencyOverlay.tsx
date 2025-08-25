import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  EyeOff, 
  Brain, 
  TrendingUp, 
  Target, 
  Shield, 
  Zap,
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MayaTransparencyOverlayProps {
  decision?: string;
  confidence: number;
  primaryFactors: string[];
  riskLevel: 'low' | 'medium' | 'high';
  expectedOutcome: string;
  gamificationInfluence?: any;
  marketData?: any;
  skillAnalysis?: any;
  className?: string;
}

export const MayaTransparencyOverlay: React.FC<MayaTransparencyOverlayProps> = ({
  decision = "Career guidance provided",
  confidence,
  primaryFactors = [],
  riskLevel = 'medium',
  expectedOutcome,
  gamificationInfluence,
  marketData,
  skillAnalysis,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    if (score >= 60) return <AlertCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  return (
    <Card className={`border-primary/20 bg-background/95 backdrop-blur-sm ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-medium">Maya Decision Transparency</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 ${getConfidenceColor(confidence)}`}>
                  {getConfidenceIcon(confidence)}
                  <span className="text-sm font-medium">{confidence}%</span>
                </div>
                <Badge className={getRiskColor(riskLevel)} variant="secondary">
                  {riskLevel} risk
                </Badge>
                {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Decision Summary */}
            <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Decision</p>
                  <p className="text-sm text-muted-foreground">{decision}</p>
                </div>
              </div>
            </div>

            {/* Confidence Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Confidence Analysis
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Overall Confidence</span>
                  <span className={getConfidenceColor(confidence)} >{confidence}%</span>
                </div>
                <Progress value={confidence} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {primaryFactors.length} key factors and current market data
              </p>
            </div>

            {/* Primary Factors */}
            {primaryFactors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Key Decision Factors
                </h4>
                <div className="space-y-1">
                  {primaryFactors.map((factor, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expected Outcome */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Expected Outcome
              </h4>
              <p className="text-sm text-muted-foreground p-2 rounded-md bg-muted/50">
                {expectedOutcome}
              </p>
            </div>

            {/* Detailed Analysis Toggle */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full justify-between"
              >
                {showDetails ? 'Hide' : 'Show'} Detailed Analysis
                <Info className="h-4 w-4" />
              </Button>
              
              {showDetails && (
                <div className="mt-3 space-y-3 text-xs">
                  {/* Gamification Influence */}
                  {gamificationInfluence && (
                    <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/20">
                      <h5 className="font-medium text-blue-700 dark:text-blue-300">Engagement Context</h5>
                      <p className="text-blue-600 dark:text-blue-400 mt-1">
                        Current streak and progress influenced recommendation timing and approach
                      </p>
                    </div>
                  )}

                  {/* Market Data */}
                  {marketData && (
                    <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/20">
                      <h5 className="font-medium text-green-700 dark:text-green-300">Market Intelligence</h5>
                      <p className="text-green-600 dark:text-green-400 mt-1">
                        Real-time market trends and demand forecasting integrated
                      </p>
                    </div>
                  )}

                  {/* Skill Analysis */}
                  {skillAnalysis && (
                    <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/20">
                      <h5 className="font-medium text-purple-700 dark:text-purple-300">Skill Assessment</h5>
                      <p className="text-purple-600 dark:text-purple-400 mt-1">
                        Personal skill gaps and growth trajectory analyzed
                      </p>
                    </div>
                  )}

                  {/* Risk Assessment */}
                  <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-950/20">
                    <h5 className="font-medium text-orange-700 dark:text-orange-300">Risk Assessment</h5>
                    <p className="text-orange-600 dark:text-orange-400 mt-1">
                      {riskLevel === 'low' && 'Low risk path with high success probability'}
                      {riskLevel === 'medium' && 'Moderate risk requiring careful planning and execution'}
                      {riskLevel === 'high' && 'Higher risk path but potentially high reward opportunity'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Maya Explains */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Maya uses your personal data, market intelligence, and career patterns to provide this guidance.
                All analysis respects your privacy and learning preferences.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};