import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, MapPin, Users, TrendingUp, BookOpen, 
  Star, Filter, Briefcase, GraduationCap 
} from "lucide-react";
import { Link } from "react-router-dom";
import TutorialTip from "@/tutorial/TutorialTip";
import { TIPS } from "@/tutorial/tutorial-map";

export function DiscoverWithTutorials() {
  const discoverFeatures = [
    {
      id: "courseRecommendations",
      title: "Course Recommendations",
      description: "AI-powered course suggestions based on your career goals and skill gaps",
      icon: BookOpen,
      link: "/discover/courses",
      tips: "exploreRecommendations"
    },
    {
      id: "skillGapAnalysis", 
      title: "Skill Gap Analysis",
      description: "Identify gaps between your current skills and target role requirements",
      icon: TrendingUp,
      link: "/discover/skills",
      tips: "skillGaps"
    },
    {
      id: "mentorNetwork",
      title: "Mentor Network", 
      description: "Connect with industry experts and experienced professionals",
      icon: Users,
      link: "/discover/mentors",
      tips: "mentorConnect"
    },
    {
      id: "marketIntelligence",
      title: "Market Intelligence",
      description: "Real-time job market data, salary trends, and demand insights",
      icon: Briefcase,
      link: "/discover/market",
      tips: "marketInsights"
    },
    {
      id: "salaryAnalyzer",
      title: "Salary Analyzer",
      description: "Compare salaries across roles, locations, and experience levels",
      icon: Star,
      link: "/discover/salary",
      tips: "salaryAnalyzer"
    },
    {
      id: "talentProfiles",
      title: "Talent Profiles",
      description: "Browse verified professionals and their career achievements",
      icon: GraduationCap,
      link: "/resume-gallery",
      tips: "featuredProfessionals"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <h1 className="text-4xl font-bold">Discover Career Insights</h1>
          <TutorialTip 
            id="discoverOverview" 
            label="The Discover hub helps you explore career opportunities, find learning resources, connect with mentors, and analyze market trends. Use these tools to make informed career decisions." 
          />
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore courses, connect with mentors, analyze market trends, and discover career opportunities
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Quick Discovery Actions
            <TutorialTip 
              id="quickDiscoveryActions" 
              label="These quick actions help you immediately start exploring the most valuable career discovery features. Each leads to detailed analysis and recommendations." 
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoverFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{feature.title}</h3>
                          <TutorialTip 
                            id={feature.tips} 
                            label={TIPS[feature.tips as keyof typeof TIPS]} 
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {feature.description}
                        </p>
                        <Button size="sm" variant="outline" asChild className="w-full">
                          <Link to={feature.link}>
                            Explore
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Discovery Tools */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Search
              <TutorialTip 
                id="advancedDiscovery" 
                label="Use advanced filters to find exactly what you're looking for - courses by provider, mentors by industry, jobs by salary range, and more specific criteria." 
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Industry Filter</Badge>
              <Badge variant="outline">Experience Level</Badge>
              <Badge variant="outline">Location</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Apply multiple filters to narrow down your search results and find the most relevant opportunities
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Open Advanced Search
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Intelligence
              <TutorialTip 
                id="locationIntelligence" 
                label="Discover career opportunities and market conditions specific to different locations. Compare salaries, job availability, and cost of living across cities." 
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Remote Jobs</Badge>
              <Badge variant="outline">Local Market</Badge>
              <Badge variant="outline">Relocation</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Analyze job markets across different locations to optimize your career opportunities
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Explore Locations
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}