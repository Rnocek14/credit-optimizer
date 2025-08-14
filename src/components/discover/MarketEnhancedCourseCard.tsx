import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, DollarSign, Clock, Star, Target, Info } from 'lucide-react';
import { MarketTooltip } from './MarketTooltip';
import { calculateCourseROI } from '@/lib/marketScoring';
import { SaveToPlanButton } from '@/components/SaveToPlanButton';

interface Course {
  id: string;
  title: string;
  platform: string;
  url?: string;
  difficulty?: string;
  cost?: string;
  description?: string;
  skill_tags?: string[];
  duration_hours?: number;
  instructor_rating?: number;
  criBreakdown?: any;
}

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

interface MarketEnhancedCourseCardProps {
  course: Course;
  marketData?: MarketData;
  currentSalary?: number;
  targetRole?: string;
  compact?: boolean;
  showROI?: boolean;
  className?: string;
}

export const MarketEnhancedCourseCard: React.FC<MarketEnhancedCourseCardProps> = ({
  course,
  marketData,
  currentSalary = 75000, // Default current salary
  targetRole,
  compact = false,
  showROI = true,
  className = ''
}) => {
  // Calculate Expected ROI
  const courseCost = course.cost ? 
    (typeof course.cost === 'string' ? 
      (course.cost === 'Free' ? 0 : parseFloat(course.cost.replace(/[$,]/g, ''))) : 
      course.cost
    ) : 100; // Default cost if not specified
  
  const timeToSkill = course.duration_hours ? Math.ceil(course.duration_hours / 40) : 3; // Convert hours to months
  const attainmentProbability = course.criBreakdown ? 
    Math.min(course.criBreakdown.overall / 100, 1) : 
    0.7; // Default 70% if no CRI data

  const expectedROI = marketData && showROI ? calculateCourseROI({
    currentSalary,
    targetSalary: marketData.average_salary,
    courseCost,
    timeToSkill,
    attainmentProbability
  }) : 0;

  const getROIColor = (roi: number) => {
    if (roi >= 200) return 'text-green-600';
    if (roi >= 100) return 'text-blue-600';
    if (roi >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      case 'Expert': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartCourse = () => {
    if (course.url) {
      window.open(course.url, '_blank');
    }
  };

  if (compact) {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{course.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{course.platform}</p>
              
              <div className="flex items-center gap-2 mt-2">
                {course.difficulty && (
                  <Badge variant="outline" className={`text-xs ${getDifficultyColor(course.difficulty)}`}>
                    {course.difficulty}
                  </Badge>
                )}
                {showROI && expectedROI > 0 && (
                  <div className={`text-xs font-medium ${getROIColor(expectedROI)}`}>
                    {expectedROI}% ROI
                  </div>
                )}
              </div>
            </div>
            
            <Button size="sm" variant="outline" onClick={handleStartCourse}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{course.title}</CardTitle>
            <p className="text-muted-foreground mt-1">{course.platform}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {course.difficulty && (
              <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                {course.difficulty}
              </Badge>
            )}
            {course.instructor_rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{course.instructor_rating}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Market Intelligence & ROI */}
        {marketData && showROI && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Expected ROI</span>
              <MarketTooltip 
                marketData={marketData} 
                opportunityScore={0}
                locationMultiplier={1}
              >
                <div className="flex items-center gap-1 cursor-help">
                  <span className={`font-bold ${getROIColor(expectedROI)}`}>
                    {expectedROI}%
                  </span>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </div>
              </MarketTooltip>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">{timeToSkill}mo</div>
                <div className="text-muted-foreground">Time to skill</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{(attainmentProbability * 100).toFixed(0)}%</div>
                <div className="text-muted-foreground">Success rate</div>
              </div>
              <div className="text-center">
                <div className="font-medium">
                  ${((marketData.average_salary - currentSalary) / 1000).toFixed(0)}k
                </div>
                <div className="text-muted-foreground">Salary uplift</div>
              </div>
            </div>
          </div>
        )}

        {/* Course Details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {course.cost && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {course.cost}
            </div>
          )}
          {course.duration_hours && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {course.duration_hours}h
            </div>
          )}
          {marketData && (
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>Demand: {marketData.demand_score}</span>
            </div>
          )}
        </div>

        {/* Skill Tags */}
        {course.skill_tags && course.skill_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {course.skill_tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {course.skill_tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{course.skill_tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleStartCourse} className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            Start Learning
          </Button>
          
          <SaveToPlanButton 
            item={{
              type: 'course',
              id: course.id,
              title: course.title,
              description: course.description,
              skillTags: course.skill_tags,
              metadata: {
                platform: course.platform,
                difficulty: course.difficulty,
                cost: course.cost,
                url: course.url,
                expectedROI: expectedROI
              }
            }}
            variant="outline"
            size="default"
            showPrioritySelector={true}
          />
        </div>
      </CardContent>
    </Card>
  );
};