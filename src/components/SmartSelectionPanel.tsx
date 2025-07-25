import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, MapPin, Zap, Target } from 'lucide-react';

interface SmartSuggestion {
  careerPath: { id: string; title: string };
  location: { id: string; label: string; value: string; emoji: string };
  reason: string;
  priority: number;
}

interface SmartSelectionPanelProps {
  suggestions: SmartSuggestion[];
  onSuggestionSelect: (careerPath: any, location: any) => void;
  onQuickAnalyze: (careerPath: any, location: any) => void;
  isVisible: boolean;
}

export const SmartSelectionPanel: React.FC<SmartSelectionPanelProps> = ({
  suggestions,
  onSuggestionSelect,
  onQuickAnalyze,
  isVisible
}) => {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Smart Market Insights</CardTitle>
        </div>
        <CardDescription>
          AI-powered suggestions based on current market trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <div
              key={`${suggestion.careerPath.id}-${suggestion.location.id}`}
              className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {suggestion.careerPath.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{suggestion.location.emoji} {suggestion.location.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {suggestion.reason}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSuggestionSelect(suggestion.careerPath, suggestion.location)}
                  className="h-8 px-3 text-xs"
                >
                  Select
                </Button>
                <Button
                  size="sm"
                  onClick={() => onQuickAnalyze(suggestion.careerPath, suggestion.location)}
                  className="h-8 px-3 text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Analyze
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};