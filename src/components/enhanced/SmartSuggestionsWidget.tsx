import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Target,
  ArrowRight,
  Sparkles 
} from 'lucide-react';

interface SmartSuggestion {
  type: 'acceleration' | 'opportunity' | 'preparation' | 'optimization';
  title: string;
  description: string;
  action: () => void;
  confidence: number;
  priority?: 'high' | 'medium' | 'low';
}

interface SmartSuggestionsWidgetProps {
  suggestions: SmartSuggestion[];
  mayaReasoning?: string;
  className?: string;
}

export function SmartSuggestionsWidget({ 
  suggestions, 
  mayaReasoning,
  className = "" 
}: SmartSuggestionsWidgetProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'acceleration': return <Clock className="w-4 h-4" />;
      case 'opportunity': return <TrendingUp className="w-4 h-4" />;
      case 'preparation': return <Target className="w-4 h-4" />;
      case 'optimization': return <Sparkles className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'acceleration': return 'text-blue-600 bg-blue-50';
      case 'opportunity': return 'text-green-600 bg-green-50';
      case 'preparation': return 'text-orange-600 bg-orange-50';
      case 'optimization': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          Maya's Smart Suggestions
        </CardTitle>
        {mayaReasoning && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            {mayaReasoning}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <Card key={index} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1 rounded ${getTypeColor(suggestion.type)}`}>
                    {getTypeIcon(suggestion.type)}
                  </div>
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <Badge className={getConfidenceColor(suggestion.confidence)}>
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {suggestion.description}
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={suggestion.action}
              className="w-full"
              variant="outline"
            >
              <span>Take Action</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}