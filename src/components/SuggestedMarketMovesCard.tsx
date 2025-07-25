import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePersonalizedInsights, type Recommendation } from '@/hooks/usePersonalizedInsights';
import { 
  TrendingUp, 
  MapPin, 
  GraduationCap, 
  Bell, 
  X, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCw,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const getRecommendationIcon = (type: Recommendation['recommendation_type']) => {
  switch (type) {
    case 'career_move':
      return TrendingUp;
    case 'location_move':
      return MapPin;
    case 'skill_development':
      return GraduationCap;
    case 'market_alert':
      return Bell;
    default:
      return Sparkles;
  }
};

const getRecommendationColor = (type: Recommendation['recommendation_type']) => {
  switch (type) {
    case 'career_move':
      return 'bg-gradient-to-r from-emerald-500 to-teal-600';
    case 'location_move':
      return 'bg-gradient-to-r from-blue-500 to-cyan-600';
    case 'skill_development':
      return 'bg-gradient-to-r from-purple-500 to-indigo-600';
    case 'market_alert':
      return 'bg-gradient-to-r from-orange-500 to-red-600';
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-600';
  }
};

interface RecommendationCardProps {
  recommendation: Recommendation;
  onDismiss: (id: string) => void;
  onFeedback: (id: string, feedback: any) => void;
}

const RecommendationCard = ({ recommendation, onDismiss, onFeedback }: RecommendationCardProps) => {
  const Icon = getRecommendationIcon(recommendation.recommendation_type);
  const gradientClass = getRecommendationColor(recommendation.recommendation_type);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${gradientClass}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                {recommendation.recommendation_data.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {recommendation.recommendation_type.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span className="text-xs text-muted-foreground">
                    {recommendation.confidence_score}% confidence
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(recommendation.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <CardDescription className="text-sm mb-3 line-clamp-2">
          {recommendation.recommendation_data.description}
        </CardDescription>
        
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Priority Score</span>
            <span>{recommendation.priority_score}/100</span>
          </div>
          <Progress value={recommendation.priority_score} className="h-1" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFeedback(recommendation.id, { feedback_type: 'helpful', rating: 5 })}
              className="h-7 px-2"
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFeedback(recommendation.id, { feedback_type: 'not_helpful', rating: 2 })}
              className="h-7 px-2"
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-primary">
                Details <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {recommendation.recommendation_data.title}
                </DialogTitle>
                <DialogDescription>
                  Personalized recommendation based on your profile and market trends
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.recommendation_data.description}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2">Why This Recommendation?</h4>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.reasoning}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2">Next Steps</h4>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.action_required}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => onFeedback(recommendation.id, { feedback_type: 'completed' })}
                    className="flex-1"
                  >
                    Mark Complete
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onDismiss(recommendation.id)}
                    className="flex-1"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export const SuggestedMarketMovesCard = () => {
  const {
    recommendations,
    loading,
    error,
    refreshRecommendations,
    dismissRecommendation,
    provideFeedback,
    getTopRecommendations
  } = usePersonalizedInsights();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRecommendations();
    setRefreshing(false);
  };

  const topRecommendations = getTopRecommendations(3);

  if (loading && recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Suggested Market Moves
              </CardTitle>
              <CardDescription>
                Personalized recommendations based on your profile
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Suggested Market Moves
            </CardTitle>
            <CardDescription>
              AI-powered recommendations tailored to your career goals
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="p-4 border border-destructive/20 rounded-lg mb-4 bg-destructive/5">
            <p className="text-sm text-destructive">
              {error}
            </p>
          </div>
        )}

        {topRecommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Recommendations Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Complete your profile and set career goals to get personalized market insights.
            </p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Generate Recommendations
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {topRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onDismiss={dismissRecommendation}
                onFeedback={provideFeedback}
              />
            ))}
            
            {recommendations.length > 3 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  View All {recommendations.length} Recommendations
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};