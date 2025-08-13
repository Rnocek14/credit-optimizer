import { HubNavigation } from "@/components/HubNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, DollarSign, BookOpen, Users, Briefcase, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
// Track selector component would be imported here
import { MayaGuidancePanel } from "@/components/MayaGuidancePanel";

export default function DiscoverHub() {
  const { activeTrackId } = useActiveTrackStore();

  const careerPaths = [
    {
      title: "Data Scientist",
      description: "Analyze complex data to drive business decisions",
      avgSalary: "$95,000",
      growth: "+8.5%",
      market: "High Demand",
      timeToRole: "6-12 months",
      href: "/explore"
    },
    {
      title: "Software Engineer", 
      description: "Build applications and systems that power the digital world",
      avgSalary: "$88,000",
      growth: "+13%",
      market: "Very High Demand",
      timeToRole: "4-8 months",
      href: "/explore"
    },
    {
      title: "UX Designer",
      description: "Create intuitive user experiences for digital products",
      avgSalary: "$75,000",
      growth: "+5%",
      market: "Moderate Demand",
      timeToRole: "3-6 months",
      href: "/explore"
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
          title="Courses that unlock your next step..."
          message="Based on your goal to become a Data Scientist, I recommend starting with Python fundamentals, then moving to statistics and machine learning."
          className="mb-6"
        />

        <Tabs defaultValue="careers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="careers" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Career Paths
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="mentors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mentors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="careers" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {careerPaths.map((career, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{career.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {career.description}
                        </CardDescription>
                      </div>
                      <Badge variant={career.market === "Very High Demand" ? "default" : "secondary"}>
                        {career.market}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Salary:</span>
                        <span className="font-medium">{career.avgSalary}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Growth:</span>
                        <span className="font-medium text-green-600">{career.growth}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time to Role:</span>
                        <span className="font-medium">{career.timeToRole}</span>
                      </div>
                      <Button asChild className="w-full mt-4">
                        <Link to={career.href}>
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

          <TabsContent value="courses" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedCourses.map((course, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <CardDescription>{course.provider}</CardDescription>
                      </div>
                      <Badge variant="outline">{course.relevantTo}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rating:</span>
                        <span className="font-medium">⭐ {course.rating}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{course.duration}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">{course.price}</span>
                      </div>
                      <Button asChild className="w-full mt-4">
                        <Link to={course.href}>
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
                      <Button asChild className="w-full mt-4">
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