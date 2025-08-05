import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HubNavigation } from "@/components/HubNavigation";
import { useCourseIntelligence, type LearningPath } from "@/hooks/useCourseIntelligence";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Clock, Users, TrendingUp } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";

export default function LearningPaths() {
  const { getLearningPaths, loading, error } = useCourseIntelligence();
  const [paths, setPaths] = useState<LearningPath[]>([]);

  useEffect(() => {
    const loadPaths = async () => {
      try {
        const data = await getLearningPaths();
        setPaths(data || []);
      } catch (err) {
        console.error('Failed to load learning paths:', err);
      }
    };

    loadPaths();
  }, [getLearningPaths]);

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCRIColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Maya-Verified Learning Paths</h1>
          <p className="text-muted-foreground">
            AI-curated learning journeys optimized for career outcomes and market demand.
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {paths.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Learning Paths Yet</h3>
              <p className="text-muted-foreground mb-4">
                Maya is analyzing course combinations to create optimized learning paths.
              </p>
              <Button variant="outline">
                View Course Discovery
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paths.map((path) => (
              <Card key={path.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                  <div className="flex-1">
                      <CardTitle className="text-lg">{path.path_name}</CardTitle>
                      <CardDescription className="mt-2">
                        {path.path_description || 'AI-curated learning path'}
                      </CardDescription>
                    </div>
                    <Badge className={getCRIColor(path.average_outcome_score)}>
                      Outcome: {path.average_outcome_score}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {path.target_career}
                      </Badge>
                      <Badge className={getDifficultyColor(path.skill_level)}>
                        {path.skill_level}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{path.estimated_duration_weeks}w</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{Array.isArray(path.course_sequence) ? path.course_sequence.length : 0} courses</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{Math.round(path.completion_rate)}% complete</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>High ROI</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        Market Demand: {path.market_demand_score}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        AI Confidence: {path.ai_confidence}%
                      </Badge>
                    </div>

                    <Button className="w-full" variant="outline">
                      View Path Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}