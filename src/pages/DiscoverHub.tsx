import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Users, Briefcase, DollarSign, TrendingUp, Target } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { MarketEnhancedCourseCard } from "@/components/discover/MarketEnhancedCourseCard";
import { SortingControls, type SortOption } from "@/components/discover/SortingControls";
import { useMarketIntelligence } from "@/hooks/useMarketIntelligence";
import { useRealCourseRecommendations } from "@/hooks/useRealCourseRecommendations";
import { useSkillGaps } from "@/hooks/useSkillGaps";
import { useUser } from "@/hooks/useUser";
import { sortMarketTrends } from "@/lib/marketScoring";
import { getRelevantCareerPaths, DEFAULT_MARKET_DATA } from "@/lib/skillCareerMapping";
import { fetchCareerPaths } from "@/shared/lib/api/marketIntelligence";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";

export default function DiscoverHub() {
  const { activeTrackId } = useActiveTrackStore();
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentSort, setCurrentSort] = useState<SortOption>('opportunity');
  
  // Real career paths from DB (57 rows)
  const { data: careerPaths = [], isLoading: careersLoading } = useQuery({
    queryKey: ['career-paths-discover'],
    queryFn: fetchCareerPaths,
    staleTime: 5 * 60_000,
  });

  // Skill gaps for course recommendations — no fake fallback
  const { data: userSkillGaps = [], isLoading: skillGapsLoading } = useSkillGaps(user?.id);
  const hasRealGaps = userSkillGaps.length > 0;
  const skillGapsForRecommendations = hasRealGaps
    ? userSkillGaps.map(gap => gap.skill)
    : []; // empty = show trending only, no fake personalization

  // Market intelligence
  const { marketData, fetchMarketTrends, loading: marketLoading } = useMarketIntelligence();
  
  // Course recommendations
  const { 
    recommendations, trendingCourses, 
    isLoadingRecommendations, isLoadingTrending, recommendationsError
  } = useRealCourseRecommendations(skillGapsForRecommendations, 80);

  useEffect(() => { fetchMarketTrends(); }, [fetchMarketTrends]);

  const handleSortChange = (sort: SortOption) => {
    setCurrentSort(sort);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('sort', sort);
      return newParams;
    });
  };

  const sortedMarketData = sortMarketTrends(marketData, currentSort);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Discover Careers & Courses | Pivot</title>
        <meta name="description" content="Explore career paths, browse courses, and find your direction with real market data." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Discover Your Path</h1>
          <p className="text-muted-foreground">
            Explore career opportunities and courses backed by real market data
          </p>
        </div>

        <SortingControls 
          currentSort={currentSort}
          onSortChange={handleSortChange}
          showTimeSort={true}
          className="mb-6"
        />

        <Tabs defaultValue="careers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="careers" data-testid="tab-careers" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Career Paths ({careerPaths.length})
            </TabsTrigger>
            <TabsTrigger value="courses" data-testid="tab-courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="mentors" data-testid="tab-mentors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mentors
            </TabsTrigger>
          </TabsList>

          {/* ── Careers Tab: Real DB data ─────────────────────── */}
          <TabsContent value="careers" className="mt-6">
            {careersLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-full mt-2" /></CardHeader>
                    <CardContent><div className="h-8 bg-muted rounded" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : careerPaths.length === 0 ? (
              <Card className="p-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No career paths available</h3>
                <p className="text-muted-foreground">Career data is being loaded. Check back soon.</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {careerPaths.map((career) => (
                  <Card key={career.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{career.title}</CardTitle>
                        {career.industry && (
                          <Badge variant="outline">{career.industry}</Badge>
                        )}
                      </div>
                      {career.summary && (
                        <CardDescription className="line-clamp-2">{career.summary}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          {career.average_salary && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5" />
                              ${(career.average_salary / 1000).toFixed(0)}k avg
                            </span>
                          )}
                          {career.growth_outlook && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <TrendingUp className="h-3.5 w-3.5" />
                              {career.growth_outlook}
                            </span>
                          )}
                        </div>
                        {career.key_skills && career.key_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {career.key_skills.slice(0, 4).map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                            {career.key_skills.length > 4 && (
                              <Badge variant="outline" className="text-xs">+{career.key_skills.length - 4}</Badge>
                            )}
                          </div>
                        )}
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link to={`/explore/careers/${career.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Courses Tab: Real recommendations ─────────────── */}
          <TabsContent value="courses" className="mt-6">
            {recommendationsError && !isLoadingRecommendations && (
              <Card className="p-6 text-center mb-4">
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Unable to load course recommendations. Showing cached results.
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
                </CardContent>
              </Card>
            )}
            
            {!hasRealGaps && !skillGapsLoading && (
              <Card className="mb-4 border-dashed border-2 border-primary/20">
                <CardContent className="flex items-center gap-4 p-4">
                  <Target className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Set a career goal for personalized recommendations</p>
                    <p className="text-sm text-muted-foreground">Showing trending courses. Set a target role to get tailored suggestions.</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/plan?tab=goals">Set Goal</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {(isLoadingRecommendations || isLoadingTrending || skillGapsLoading) ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2 mt-2" /></CardHeader>
                    <CardContent><div className="h-8 bg-muted rounded" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(() => {
                  const coursesToShow = hasRealGaps && recommendations.length > 0 ? recommendations : trendingCourses;
                  if (coursesToShow.length === 0) {
                    return (
                      <Card className="col-span-full p-6 text-center">
                        <CardContent>
                          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-medium mb-2">No courses available</h3>
                          <p className="text-muted-foreground">Check back soon for course listings.</p>
                        </CardContent>
                      </Card>
                    );
                  }
                  return coursesToShow.slice(0, 12).map((course) => {
                    let relevantMarketData = null;
                    if (course.skill_tags?.length) {
                      const relevantCareers = getRelevantCareerPaths(course.skill_tags);
                      for (const career of relevantCareers) {
                        const match = sortedMarketData.find(t => 
                          t.career_path.toLowerCase().includes(career.toLowerCase()) ||
                          career.toLowerCase().includes(t.career_path.toLowerCase())
                        );
                        if (match) { relevantMarketData = match; break; }
                      }
                    }
                    if (!relevantMarketData) {
                      relevantMarketData = {
                        ...DEFAULT_MARKET_DATA,
                        career_path: course.skill_tags?.[0] ? `${course.skill_tags[0]} Professional` : "Technology Professional"
                      };
                    }
                    return (
                      <MarketEnhancedCourseCard
                        key={course.id}
                        course={{ ...course, cost: course.cost ? String(course.cost) : undefined }}
                        marketData={{ ...relevantMarketData, updated_at: new Date().toISOString() }}
                        currentSalary={75000}
                        targetRole={relevantMarketData?.career_path}
                        showROI={true}
                      />
                    );
                  });
                })()}
              </div>
            )}
          </TabsContent>

          {/* ── Mentors Tab: Coming Soon ──────────────────────── */}
          <TabsContent value="mentors" className="mt-6">
            <Card className="border-dashed border-2 border-muted-foreground/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Mentorship — Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  Connect with experienced professionals for career guidance.
                  We're building a mentor matching system — stay tuned.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
