import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MapPin, Briefcase, Clock, Star } from 'lucide-react';

interface MarketTrend {
  id: string;
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
}

interface SmartSuggestionsWidgetProps {
  marketData: MarketTrend[];
  selectedCareerPath?: string;
  selectedLocation?: string;
  onSuggestionSelect?: (careerPath: string, location: string) => void;
}

interface SmartSuggestion {
  id: string;
  type: 'career_location' | 'alternative_career' | 'timing_opportunity' | 'pivot_strategy';
  title: string;
  description: string;
  careerPath: string;
  location: string;
  confidence: number;
  opportunityScore: number;
  reasoning: string;
  timeframe: string;
  salaryRange?: string;
  metrics: {
    growth: number;
    demand: number;
    competition: string;
    jobCount: number;
  };
}

export const SmartSuggestionsWidget: React.FC<SmartSuggestionsWidgetProps> = ({
  marketData,
  selectedCareerPath,
  selectedLocation,
  onSuggestionSelect
}) => {
  const generateSmartSuggestions = (): SmartSuggestion[] => {
    if (!marketData || marketData.length === 0) {
      return [{
        id: 'no-data',
        type: 'career_location',
        title: 'Generate Market Analysis',
        description: 'Run market analysis to receive personalized recommendations',
        careerPath: 'Data Scientist',
        location: 'San Francisco',
        confidence: 0,
        opportunityScore: 0,
        reasoning: 'No market data available for intelligent recommendations',
        timeframe: 'N/A',
        metrics: {
          growth: 0,
          demand: 0,
          competition: 'unknown',
          jobCount: 0
        }
      }];
    }

    const suggestions: SmartSuggestion[] = [];

    // Find top opportunities by overall metrics
    const scoredMarkets = marketData.map(market => ({
      ...market,
      opportunityScore: calculateOpportunityScore(market)
    })).sort((a, b) => b.opportunityScore - a.opportunityScore);

    // Best overall opportunity
    if (scoredMarkets.length > 0) {
      const topMarket = scoredMarkets[0];
      suggestions.push({
        id: 'best-opportunity',
        type: 'career_location',
        title: `${topMarket.career_path} in ${topMarket.location}`,
        description: 'Highest overall opportunity score combining growth, demand, and salary',
        careerPath: topMarket.career_path,
        location: topMarket.location,
        confidence: 92,
        opportunityScore: topMarket.opportunityScore,
        reasoning: `Strong ${topMarket.growth_rate}% growth with ${topMarket.demand_score}/10 demand score`,
        timeframe: '3-6 months',
        salaryRange: `$${Math.round(topMarket.average_salary * 0.9).toLocaleString()} - $${Math.round(topMarket.average_salary * 1.1).toLocaleString()}`,
        metrics: {
          growth: topMarket.growth_rate,
          demand: topMarket.demand_score,
          competition: topMarket.competition_level,
          jobCount: topMarket.job_postings_count
        }
      });
    }

    // High growth opportunity
    const highGrowthMarkets = marketData.filter(m => m.growth_rate > 15);
    if (highGrowthMarkets.length > 0) {
      const growthLeader = highGrowthMarkets.sort((a, b) => b.growth_rate - a.growth_rate)[0];
      suggestions.push({
        id: 'high-growth',
        type: 'timing_opportunity',
        title: `Rapid Growth: ${growthLeader.career_path}`,
        description: 'Market experiencing exceptional growth rates',
        careerPath: growthLeader.career_path,
        location: growthLeader.location,
        confidence: 88,
        opportunityScore: calculateOpportunityScore(growthLeader),
        reasoning: `${growthLeader.growth_rate}% growth rate indicates expanding market opportunities`,
        timeframe: '1-3 months',
        salaryRange: `$${Math.round(growthLeader.average_salary * 0.95).toLocaleString()} - $${Math.round(growthLeader.average_salary * 1.15).toLocaleString()}`,
        metrics: {
          growth: growthLeader.growth_rate,
          demand: growthLeader.demand_score,
          competition: growthLeader.competition_level,
          jobCount: growthLeader.job_postings_count
        }
      });
    }

    // Low competition opportunity
    const lowCompetitionMarkets = marketData.filter(m => m.competition_level === 'low');
    if (lowCompetitionMarkets.length > 0) {
      const bestLowComp = lowCompetitionMarkets.sort((a, b) => b.average_salary - a.average_salary)[0];
      suggestions.push({
        id: 'low-competition',
        type: 'pivot_strategy',
        title: `Lower Competition: ${bestLowComp.career_path}`,
        description: 'Excellent entry opportunity with reduced competition',
        careerPath: bestLowComp.career_path,
        location: bestLowComp.location,
        confidence: 85,
        opportunityScore: calculateOpportunityScore(bestLowComp),
        reasoning: 'Low competition increases chances of successful entry and faster advancement',
        timeframe: '2-4 months',
        salaryRange: `$${Math.round(bestLowComp.average_salary * 0.9).toLocaleString()} - $${Math.round(bestLowComp.average_salary * 1.1).toLocaleString()}`,
        metrics: {
          growth: bestLowComp.growth_rate,
          demand: bestLowComp.demand_score,
          competition: bestLowComp.competition_level,
          jobCount: bestLowComp.job_postings_count
        }
      });
    }

    // Alternative career suggestion (if user has selected a career)
    if (selectedCareerPath) {
      const similarCareers = marketData.filter(m => 
        m.career_path !== selectedCareerPath && 
        (m.career_path.includes('Engineer') && selectedCareerPath.includes('Engineer') ||
         m.career_path.includes('Data') && selectedCareerPath.includes('Data') ||
         m.career_path.includes('Manager') && selectedCareerPath.includes('Manager'))
      );
      
      if (similarCareers.length > 0) {
        const bestAlternative = similarCareers.sort((a, b) => b.average_salary - a.average_salary)[0];
        suggestions.push({
          id: 'alternative-career',
          type: 'alternative_career',
          title: `Consider: ${bestAlternative.career_path}`,
          description: 'Similar skillset with potentially better market conditions',
          careerPath: bestAlternative.career_path,
          location: bestAlternative.location,
          confidence: 78,
          opportunityScore: calculateOpportunityScore(bestAlternative),
          reasoning: 'Related career path with stronger salary potential and market demand',
          timeframe: '4-8 months',
          salaryRange: `$${Math.round(bestAlternative.average_salary * 0.9).toLocaleString()} - $${Math.round(bestAlternative.average_salary * 1.1).toLocaleString()}`,
          metrics: {
            growth: bestAlternative.growth_rate,
            demand: bestAlternative.demand_score,
            competition: bestAlternative.competition_level,
            jobCount: bestAlternative.job_postings_count
          }
        });
      }
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  };

  const calculateOpportunityScore = (market: MarketTrend): number => {
    const growthScore = Math.min(100, (market.growth_rate + 10) * 3);
    const demandScore = (market.demand_score / 10) * 100;
    const salaryScore = Math.min(100, (market.average_salary - 30000) / 1000);
    const competitionScore = market.competition_level === 'low' ? 90 : 
                            market.competition_level === 'medium' ? 60 : 30;
    
    return Math.round((growthScore * 0.3) + (demandScore * 0.25) + (salaryScore * 0.25) + (competitionScore * 0.2));
  };

  const suggestions = generateSmartSuggestions();

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'career_location': return <Star className="h-4 w-4 text-yellow-600" />;
      case 'alternative_career': return <Briefcase className="h-4 w-4 text-blue-600" />;
      case 'timing_opportunity': return <Clock className="h-4 w-4 text-green-600" />;
      case 'pivot_strategy': return <MapPin className="h-4 w-4 text-purple-600" />;
      default: return <Sparkles className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'career_location': return 'Best Match';
      case 'alternative_career': return 'Alternative';
      case 'timing_opportunity': return 'Timing';
      case 'pivot_strategy': return 'Strategy';
      default: return 'Suggestion';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 dark:text-green-400';
    if (confidence >= 80) return 'text-blue-600 dark:text-blue-400';
    if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  const handleSuggestionClick = (suggestion: SmartSuggestion) => {
    if (onSuggestionSelect && suggestion.confidence > 0) {
      onSuggestionSelect(suggestion.careerPath, suggestion.location);
    }
  };

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Smart Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion.id}
            className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer bg-card hover:bg-muted/50 ${
              suggestion.confidence === 0 ? 'opacity-60' : ''
            }`}
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getSuggestionIcon(suggestion.type)}
                <div>
                  <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getTypeLabel(suggestion.type)}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getConfidenceColor(suggestion.confidence)}`}>
                  {suggestion.confidence > 0 ? `${suggestion.confidence}%` : '--'}
                </div>
                <div className="text-xs text-muted-foreground">confidence</div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {suggestion.description}
            </p>

            <div className="text-xs text-muted-foreground mb-3 italic">
              "{suggestion.reasoning}"
            </div>

            {suggestion.confidence > 0 && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Timeframe:</span>
                    <span className="ml-1 font-medium">{suggestion.timeframe}</span>
                  </div>
                  {suggestion.salaryRange && (
                    <div>
                      <span className="text-muted-foreground">Salary:</span>
                      <span className="ml-1 font-medium">{suggestion.salaryRange}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium">{suggestion.metrics.growth}%</div>
                    <div className="text-muted-foreground">Growth</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{suggestion.metrics.demand}/10</div>
                    <div className="text-muted-foreground">Demand</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium capitalize">{suggestion.metrics.competition}</div>
                    <div className="text-muted-foreground">Competition</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{suggestion.metrics.jobCount}</div>
                    <div className="text-muted-foreground">Jobs</div>
                  </div>
                </div>
              </>
            )}

            {suggestion.confidence > 0 && (
              <div className="mt-3 pt-2 border-t">
                <button className="text-xs text-primary hover:text-primary/80 font-medium">
                  Analyze This Opportunity →
                </button>
              </div>
            )}
          </div>
        ))}

        {suggestions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No suggestions available. Add market data to generate intelligent recommendations.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};