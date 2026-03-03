import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, DollarSign, MapPin, Info, ExternalLink, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketBar } from './MarketBar';
import { MarketTooltip } from './MarketTooltip';
import { calculateOpportunityScore, getMarketBadges } from '@/lib/marketScoring';
import { SaveToPlanButton } from '@/components/SaveToPlanButton';

interface MarketData {
  career_path: string;
  location: string;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  job_postings_count: number;
  updated_at: string;
}

interface CareerPath {
  id: string;
  title: string;
  description?: string;
  timeToRole?: string;
  industry?: string;
}

interface MarketEnhancedCareerCardProps {
  careerPath: CareerPath;
  marketData?: MarketData;
  locationMultiplier?: number;
  className?: string;
}

export const MarketEnhancedCareerCard: React.FC<MarketEnhancedCareerCardProps> = ({
  careerPath,
  marketData,
  locationMultiplier = 1.0,
  className = ''
}) => {
  const opportunityScore = marketData ? calculateOpportunityScore(marketData, locationMultiplier) : 0;
  const marketBadges = marketData ? getMarketBadges(marketData) : [];
  
  const formatSalary = (salary: number) => {
    if (salary >= 1000000) return `$${(salary / 1000000).toFixed(1)}M`;
    if (salary >= 1000) return `$${(salary / 1000).toFixed(0)}k`;
    return `$${salary.toLocaleString()}`;
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{careerPath.title}</CardTitle>
            {careerPath.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {careerPath.description}
              </CardDescription>
            )}
          </div>
          
          {/* Market badges */}
          <div className="flex flex-col gap-1 items-end">
            {marketBadges.slice(0, 2).map((badge) => (
              <Badge 
                key={badge}
                variant={badge === 'High Demand' || badge === 'Rising Star' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {badge}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Market Intelligence */}
        {marketData && (
          <div className="space-y-3">
            <MarketTooltip 
              marketData={marketData} 
              opportunityScore={opportunityScore}
              locationMultiplier={locationMultiplier}
            >
              <div className="flex items-center gap-2 cursor-help">
                <MarketBar score={opportunityScore} size="sm" showLabel={false} />
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
            </MarketTooltip>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium">{formatSalary(marketData.average_salary)}</div>
                  <div className="text-xs text-muted-foreground">median salary</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">+{marketData.growth_rate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">growth rate</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="font-medium">{marketData.location}</div>
                  <div className="text-xs text-muted-foreground">top market</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  marketData.competition_level === 'low' ? 'bg-green-500' :
                  marketData.competition_level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <div className="font-medium capitalize">{marketData.competition_level}</div>
                  <div className="text-xs text-muted-foreground">competition</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time to role */}
        {careerPath.timeToRole && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Time to Role:</span>
            <span className="font-medium">{careerPath.timeToRole}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <SaveToPlanButton 
            item={{
              type: 'career_path',
              id: careerPath.id,
              title: careerPath.title,
              description: careerPath.description,
              timeEstimate: careerPath.timeToRole,
              skillTags: careerPath.industry ? [careerPath.industry] : [],
              metadata: {
                industry: careerPath.industry,
                timeToRole: careerPath.timeToRole,
                marketData: marketData ? {
                  averageSalary: marketData.average_salary,
                  growthRate: marketData.growth_rate,
                  location: marketData.location,
                  demandScore: marketData.demand_score
                } : undefined
              }
            }}
            variant="default"
            size="default"
            showPrioritySelector={true}
            className="flex-1"
          />
          
          <Button 
            variant="outline" 
            size="default"
            asChild
          >
            <Link 
              to={`/edu-tree-v5/marketplace?careerPathId=${careerPath.id}`}
              title="Browse degree plans for this career"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Browse Plans
            </Link>
          </Button>

          <Button 
            variant="ghost" 
            size="default"
            asChild
          >
            <Link 
              to={`/discover?tab=courses&search=${encodeURIComponent(careerPath.title)}`}
              title="Find related courses"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Explore
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};