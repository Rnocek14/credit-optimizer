import { HubNavigation } from "@/components/HubNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, DollarSign, BookOpen, Users, Briefcase, Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { MayaGuidancePanel } from "@/components/MayaGuidancePanel";
import { MarketEnhancedCareerCard } from "@/components/discover/MarketEnhancedCareerCard";
import { MarketEnhancedCourseCard } from "@/components/discover/MarketEnhancedCourseCard";
import { SortingControls, type SortOption } from "@/components/discover/SortingControls";
import { useMarketIntelligence } from "@/hooks/useMarketIntelligence";
import { useRealCourseRecommendations } from "@/hooks/useRealCourseRecommendations";
import { useSkillGaps } from "@/hooks/useSkillGaps";
import { useUser } from "@/hooks/useUser";
import { sortMarketTrends } from "@/lib/marketScoring";
import { getRelevantCareerPaths, DEFAULT_MARKET_DATA } from "@/lib/skillCareerMapping";
import { useState, useEffect } from "react";

export default function DiscoverHub() {
  const { activeTrackId } = useActiveTrackStore();
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentSort, setCurrentSort] = useState<SortOption>('opportunity');
  
  // Get user's skill gaps for personalized recommendations
  const { data: userSkillGaps = [], isLoading: skillGapsLoading } = useSkillGaps(user?.id);
  
  // Create skill gaps array - use user's actual gaps or fallback to popular tech skills
  const skillGapsForRecommendations = userSkillGaps.length > 0 
    ? userSkillGaps.map(gap => gap.skill)
    : ['React', 'Python', 'JavaScript', 'Data Analysis', 'Cloud Computing', 'Machine Learning'];
  
  console.log('[discover] Using skill gaps:', skillGapsForRecommendations.slice(0, 3));
  
  // Market intelligence
  const { 
    marketData, 
    fetchMarketTrends, 
    loading: marketLoading 
  } = useMarketIntelligence();
  
  // Course recommendations with skill gaps and error handling
  const { 
    recommendations, 
    trendingCourses, 
    isLoadingRecommendations,
    isLoadingTrending,
    recommendationsError
  } = useRealCourseRecommendations(skillGapsForRecommendations, 80);

  // Fetch market data on mount
  useEffect(() => {
    fetchMarketTrends();
  }, [fetchMarketTrends]);

  // Handle sorting
  const handleSortChange = (sort: SortOption) => {
    setCurrentSort(sort);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('sort', sort);
      return newParams;
    });
  };

  // Sort market data
  const sortedMarketData = sortMarketTrends(marketData, currentSort);

  // Get market data for specific career paths
  const getMarketDataForCareer = (careerTitle: string) => {
    return sortedMarketData.find(trend => 
      trend.career_path.toLowerCase().includes(careerTitle.toLowerCase()) ||
      careerTitle.toLowerCase().includes(trend.career_path.toLowerCase())
    );
  };

  const careerPaths = [
    {
      id: "data-scientist",
      title: "Data Scientist",
      description: "Analyze complex data to drive business decisions",
      timeToRole: "6-12 months",
      industry: "Technology"
    },
    {
      id: "software-engineer", 
      title: "Software Engineer",
      description: "Build applications and systems that power the digital world", 
      timeToRole: "4-8 months",
      industry: "Technology"
    },
    {
      id: "ux-designer",
      title: "UX Designer",
      description: "Create intuitive user experiences for digital products",
      timeToRole: "3-6 months",
      industry: "Design"
    },
    {
      id: "product-manager",
      title: "Product Manager", 
      description: "Drive product strategy and development from conception to launch",
      timeToRole: "8-14 months",
      industry: "Business"
    },
    {
      id: "devops-engineer",
      title: "DevOps Engineer",
      description: "Automate and optimize software deployment and infrastructure",
      timeToRole: "6-10 months", 
      industry: "Technology"
    }
  ];

  const recommendedCourses = [
    {
      title: "Python for Data Science",
      provider: "DataCamp",
      rating: 4.8,
      duration: "40 hours",
      price: "Free",
      relevantTo: "Current step",
      href: "/explore-courses"
    },
    {
      title: "Machine Learning Basics",
      provider: "Coursera",
      rating: 4.7,
      duration: "60 hours", 
      price: "$49/month",
      relevantTo: "Next step",
      href: "/explore-courses"
    },
    {
      title: "Statistical Analysis",
      provider: "edX",
      rating: 4.6,
      duration: "35 hours",
      price: "$99",
      relevantTo: "Future milestone",
      href: "/explore-courses"
    }
  ];

  const mentors = [
    {
      name: "Sarah Chen",
      role: "Senior Data Scientist at Google",
      experience: "8 years",
      rating: 4.9,
      sessions: "150+",
      expertise: ["Python", "ML", "Statistics"],
      href: "/explore"
    },
    {
      name: "Marcus Johnson",
      role: "Lead Software Engineer at Microsoft",
      experience: "10 years",
      rating: 4.8,
      sessions: "200+",
      expertise: ["React", "Node.js", "System Design"],
      href: "/explore"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header with Track Selector */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Discover Your Path</h1>
            <p className="text-muted-foreground">
              Explore career opportunities, courses, and expert guidance
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeTrackId && (
              <Badge variant="outline" className="px-3 py-1">
                Track: Active
              </Badge>
            )}
            {/* <TrackSelector /> */}
          </div>
        </div>

        {/* Maya Guidance */}
        <MayaGuidancePanel 
          title="Market-driven recommendations for your career growth..."
          message="Based on current market trends, I recommend focusing on high-growth areas like DevOps Engineering (+18.9% growth) and Data Science. The job market shows strong demand with competitive salaries."
          className="mb-6"
        />

        {/* Sorting Controls */}
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
              Career Paths
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

          <TabsContent value="careers" className="mt-6">
            {marketLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-full mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded"></div>
                        <div className="h-8 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {careerPaths.map((career) => (
                  <MarketEnhancedCareerCard
                    key={career.id}
                    careerPath={career}
                    marketData={getMarketDataForCareer(career.title) ? {
                      ...getMarketDataForCareer(career.title)!,
                      updated_at: new Date().toISOString()
                    } : undefined}
                    locationMultiplier={1.0}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            {/* Error State */}
            {recommendationsError && !isLoadingRecommendations && (
              <Card className="p-6 text-center">
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Unable to load course recommendations. Showing cached results.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                    className="mx-auto"
                  >
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Loading State */}
            {(isLoadingRecommendations || isLoadingTrending || skillGapsLoading) ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded"></div>
                        <div className="h-8 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Show recommendations first, then trending, with proper fallback */}
                {(() => {
                  const coursesToShow = recommendations.length > 0 ? recommendations : trendingCourses;
                  
                  if (coursesToShow.length === 0) {
                    return (
                      <Card className="col-span-full p-6 text-center">
                        <CardContent>
                          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-medium mb-2">No Courses Available</h3>
                          <p className="text-muted-foreground mb-4">
                            We're having trouble loading course recommendations. Please check your connection and try again.
                          </p>
                          <Button 
                            onClick={() => window.location.reload()}
                            variant="outline"
                          >
                            Refresh Page
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  return coursesToShow.slice(0, 12).map((course) => {
                  // Enhanced skill-to-career matching
                  let relevantMarketData = null;
                  
                  if (course.skill_tags && course.skill_tags.length > 0) {
                    const relevantCareers = getRelevantCareerPaths(course.skill_tags);
                    
                    // Find the best matching market data based on career relevance
                    for (const career of relevantCareers) {
                      const marketMatch = sortedMarketData.find(trend => 
                        trend.career_path.toLowerCase().includes(career.toLowerCase()) ||
                        career.toLowerCase().includes(trend.career_path.toLowerCase())
                      );
                      if (marketMatch) {
                        relevantMarketData = marketMatch;
                        break;
                      }
                    }
                  }
                  
                  // Use default market data if no specific match found
                  if (!relevantMarketData) {
                    relevantMarketData = {
                      ...DEFAULT_MARKET_DATA,
                      career_path: course.skill_tags?.[0] ? `${course.skill_tags[0]} Professional` : "Technology Professional"
                    };
                  }
                  
                   return (
                   <MarketEnhancedCourseCard
                       key={course.id}
                       course={{
                         ...course,
                         cost: course.cost ? String(course.cost) : undefined
                       }}
                       marketData={{
                         ...relevantMarketData,
                         updated_at: new Date().toISOString()
                       }}
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

          <TabsContent value="mentors" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {mentors.map((mentor, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{mentor.name}</CardTitle>
                        <CardDescription>{mentor.role}</CardDescription>
                      </div>
                      <Badge variant="outline">⭐ {mentor.rating}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Experience:</span>
                        <span className="font-medium">{mentor.experience}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sessions:</span>
                        <span className="font-medium">{mentor.sessions}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {mentor.expertise.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <Button asChild className="w-full mt-4" data-testid="save-to-plan">
                        <Link to={mentor.href}>
                          <Plus className="h-4 w-4 mr-2" />
                          Save to Plan
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}