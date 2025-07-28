import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowUpRight, MapPin, DollarSign } from 'lucide-react';

interface CareerTrend {
  career_path: string;
  growth_rate: number;
  demand_score: number;
  average_salary: number;
  competition_level: string;
}

interface TopTrendingCareersProps {
  data: CareerTrend[];
  onCareerSelect?: (career: string) => void;
  onExploreSalaries?: (career: string) => void;
}

export function TopTrendingCareers({ 
  data = [], 
  onCareerSelect,
  onExploreSalaries 
}: TopTrendingCareersProps) {
  // Show top 5 careers or fallback data
  const displayData = data.length > 0 ? data.slice(0, 5) : [
    {
      career_path: 'Software Engineer',
      growth_rate: 12.5,
      demand_score: 95,
      average_salary: 145000,
      competition_level: 'high'
    },
    {
      career_path: 'Data Scientist',
      growth_rate: 15.2,
      demand_score: 92,
      average_salary: 138000,
      competition_level: 'high'
    },
    {
      career_path: 'UX Designer',
      growth_rate: 8.7,
      demand_score: 88,
      average_salary: 112000,
      competition_level: 'medium'
    },
    {
      career_path: 'Blockchain Developer',
      growth_rate: 89.7,
      demand_score: 97,
      average_salary: 185000,
      competition_level: 'high'
    }
  ];

  const getCompetitionColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Top Growing Careers
        </CardTitle>
        <CardDescription>
          Fastest growing careers based on market data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayData.map((career, index) => (
            <div key={career.career_path} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">#{index + 1}</span>
                  <h4 className="font-semibold">{career.career_path}</h4>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    {career.growth_rate.toFixed(1)}% growth
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${career.average_salary.toLocaleString()}
                  </span>
                  <span>Score: {career.demand_score}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={getCompetitionColor(career.competition_level)}
                >
                  {career.competition_level} competition
                </Badge>
                
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCareerSelect?.(career.career_path)}
                  >
                    Explore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExploreSalaries?.(career.career_path)}
                  >
                    Salary
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {data.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Using sample data. Select career path and location for live data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}