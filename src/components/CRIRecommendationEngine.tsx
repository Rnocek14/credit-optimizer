/**
 * CRI-based Course Recommendation Engine
 * Analyzes skill gaps and recommends courses to improve CRI score
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  TrendingUp, 
  Lightbulb, 
  Star, 
  BookOpen,
  Zap,
  Award,
  ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCRIBasedRecommendations, calculateCourseCRI } from '@/lib/criCourseIntegration';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { CourseCard } from '@/components/CourseCard';
import { supabase } from '@/integrations/supabase/client';

interface CRIRecommendationEngineProps {
  userId?: string;
  targetCRI?: number;
  skillGaps?: string[];
}

export const CRIRecommendationEngine: React.FC<CRIRecommendationEngineProps> = ({
  userId,
  targetCRI = 80,
  skillGaps = []
}) => {
  const [selectedPath, setSelectedPath] = useState<'skills' | 'experience' | 'projects'>('skills');
  
  const { criScore } = useCareerReadiness({ userId, enabled: !!userId });

  // Get CRI-based course recommendations
  const { data: criRecommendations, isLoading } = useQuery({
    queryKey: ['cri-recommendations', userId, targetCRI, skillGaps],
    queryFn: () => getCRIBasedRecommendations(userId!, targetCRI, skillGaps),
    enabled: !!userId
  });

  // Get trending high-CRI courses
  const { data: trendingCourses } = useQuery({
    queryKey: ['trending-cri-courses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('recommended_courses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      
      // Calculate CRI for each course
      const coursesWithCRI = await Promise.all(
        (data || []).map(async course => {
          const criBreakdown = await calculateCourseCRI(course);
          return { ...course, criBreakdown };
        })
      );
      
      // Sort by CRI score
      return coursesWithCRI.sort((a, b) => b.criBreakdown.overall - a.criBreakdown.overall);
    }
  });

  const currentCRI = criScore?.overall || 0;
  const criGap = targetCRI - currentCRI;
  const progressPercentage = (currentCRI / targetCRI) * 100;

  const getImpactLevel = (contribution: number) => {
    if (contribution >= 15) return { label: 'High Impact', color: 'bg-green-500' };
    if (contribution >= 10) return { label: 'Medium Impact', color: 'bg-yellow-500' };
    return { label: 'Low Impact', color: 'bg-gray-500' };
  };

  const pathRecommendations = {
    skills: {
      title: 'Skill Development Path',
      description: 'Focus on mastering key technical skills',
      icon: <Target className="h-5 w-5" />,
      courses: criRecommendations?.filter(c => c.criBreakdown.skillCoverage >= 70) || []
    },
    experience: {
      title: 'Experience Building Path',
      description: 'Gain practical experience through projects',
      icon: <Award className="h-5 w-5" />,
      courses: criRecommendations?.filter(c => c.criBreakdown.projectRigor >= 70) || []
    },
    projects: {
      title: 'Project-Based Path',
      description: 'Build portfolio through hands-on projects',
      icon: <BookOpen className="h-5 w-5" />,
      courses: criRecommendations?.filter(c => c.criBreakdown.projectRigor >= 80) || []
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CRI Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            CRI Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{currentCRI}/{targetCRI}</p>
              <p className="text-sm text-muted-foreground">Current vs Target CRI</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-primary">{criGap > 0 ? criGap : 0} points to go</p>
              <p className="text-sm text-muted-foreground">
                {progressPercentage >= 100 ? 'Goal achieved!' : 'Keep learning!'}
              </p>
            </div>
          </div>
          
          <Progress value={Math.min(progressPercentage, 100)} className="h-3" />
          
          {criGap > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">
                Complete {Math.ceil(criGap / 5)} high-impact courses to reach your goal
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendation Paths */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            CRI Boost Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPath} onValueChange={(value) => setSelectedPath(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              {Object.entries(pathRecommendations).map(([key, path]) => (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  {path.icon}
                  <span className="hidden sm:inline">{path.title.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(pathRecommendations).map(([key, path]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                <div className="text-center py-4">
                  <h3 className="text-lg font-semibold">{path.title}</h3>
                  <p className="text-muted-foreground">{path.description}</p>
                </div>

                {path.courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {path.courses.slice(0, 4).map((course) => {
                      const impact = getImpactLevel(course.criContribution || 0);
                      return (
                        <div key={course.id} className="relative">
                        <CourseCard 
                          course={course} 
                          compact
                        />
                          {course.criContribution && course.criContribution > 5 && (
                            <Badge 
                              className={`absolute -top-2 -right-2 ${impact.color} text-white text-xs`}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              +{course.criContribution.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No specific recommendations for this path yet</p>
                    <p className="text-sm">Check back as we analyze more courses</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Trending High-CRI Courses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            High-CRI Trending Courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendingCourses && trendingCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingCourses.slice(0, 6).map((course) => (
                <CourseCard 
                  key={course.id}
                  course={course} 
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Loading trending courses...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Set New CRI Goal
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Browse All Courses
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          View Skill Tree
        </Button>
      </div>
    </div>
  );
};