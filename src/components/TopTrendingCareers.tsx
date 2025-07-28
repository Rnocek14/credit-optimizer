import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ArrowUpRight,
  Eye,
  Zap
} from 'lucide-react';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';

interface TopTrendingCareersProps {
  onCareerSelect?: (careerPath: string, location: string) => void;
  selectedLocation?: string;
  limit?: number;
}

interface CareerTrend {
  career_path: string;
  growth_rate: number;
  demand_score: number;
  average_salary: number;
  competition_level: string;
  job_postings_count?: number;
  location?: string;
}

export const TopTrendingCareers: React.FC<TopTrendingCareersProps> = ({
  onCareerSelect,
  selectedLocation,
  limit = 5
}) => {
  const { getTopGrowingCareers, loading } = useMarketIntelligence();
  const [careers, setCareers] = useState<CareerTrend[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrendingCareers = async () => {
      try {
        const data = await getTopGrowingCareers(selectedLocation, limit);
        setCareers(data);
        setError(null);
      } catch (err) {
        setError('Failed to load trending careers');
        console.error('❌ Error loading trending careers:', err);
      }
    };

    loadTrendingCareers();
  }, [selectedLocation, limit, getTopGrowingCareers]);

  const getGrowthBadgeVariant = (growthRate: number) => {
    if (growthRate >= 20) return 'default';
    if (growthRate >= 10) return 'secondary';
    return 'outline';
  };

  const getGrowthIcon = (growthRate: number) => {
    return growthRate >= 0 ? 
      <TrendingUp className="h-3 w-3 text-emerald-500" /> : 
      <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  const getDemandColor = (demandScore: number) => {
    if (demandScore >= 8) return 'text-emerald-600';
    if (demandScore >= 6) return 'text-amber-600';
    return 'text-red-600';
  };

  const getCompetitionColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'text-emerald-600';
      case 'medium': return 'text-amber-600';
      case 'high': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Trending Careers
          </CardTitle>
          <CardDescription>
            Fastest growing career opportunities in your area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TrendingUp className="h-5 w-5" />
            Top Trending Careers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Trending Careers
        </CardTitle>
        <CardDescription>
          {selectedLocation ? 
            `Fastest growing opportunities in ${selectedLocation}` : 
            'Fastest growing career opportunities globally'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {careers.length === 0 ? (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No trending career data available
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {careers.map((career, index) => (
              <div 
                key={`${career.career_path}-${index}`}
                className="group p-4 rounded-lg border hover:shadow-md transition-all duration-200 hover:border-primary/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground">
                        {career.career_path}
                      </h3>
                      <Badge variant={getGrowthBadgeVariant(career.growth_rate)} className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getGrowthIcon(career.growth_rate)}
                        <span>{career.growth_rate}% growth</span>
                      </div>
                      <div className={`flex items-center gap-1 ${getDemandColor(career.demand_score)}`}>
                        <Zap className="h-3 w-3" />
                        <span>{career.demand_score}/10 demand</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${career.average_salary?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onCareerSelect?.(career.career_path, career.location || selectedLocation || '')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Analyze
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Activity</span>
                    <span className="font-medium">{Math.min(100, career.demand_score * 10)}%</span>
                  </div>
                  <Progress value={Math.min(100, career.demand_score * 10)} className="h-1" />
                </div>

                <div className="flex justify-between items-center mt-3 text-xs">
                  <span className={`font-medium ${getCompetitionColor(career.competition_level)}`}>
                    {career.competition_level} competition
                  </span>
                  {career.job_postings_count && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{career.job_postings_count} jobs</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};