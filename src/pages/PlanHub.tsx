import { HubNavigation } from "@/components/HubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Calendar, TrendingUp, Map, Users, FileText, CheckSquare, Brain, Calculator } from "lucide-react";
import MayaInlinePanel from "@/components/maya/MayaInlinePanel";
import { TodayDashboard } from "@/components/TodayDashboard";
import { SkillGapRecommendations } from "@/components/SkillGapRecommendations";
import { EnhancedGoalDashboard } from "@/components/EnhancedGoalDashboard";
import { GoalOrchestrator } from "@/components/GoalOrchestrator";
import { useCrossHubIntegration } from "@/hooks/useCrossHubIntegration";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/authHelper";
import { useSearchParams } from "react-router-dom";

const planFeatures = [
  {
    title: "AI Roadmap Generator",
    description: "Get personalized career roadmaps powered by AI",
    tab: "roadmap",
    icon: Map,
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    title: "Goal Setting & Tracking", 
    description: "Set SMART goals and track your progress",
    tab: "goals",
    icon: Target,
    color: "bg-green-500/10 text-green-600"
  },
  {
    title: "Maya Planning Assistant",
    description: "AI-powered planning and recommendations", 
    tab: "workflows",
    icon: Brain,
    color: "bg-purple-500/10 text-purple-600"
  },
  {
    title: "Project Planning",
    description: "Plan and track your proof projects",
    tab: "proof",
    icon: CheckSquare,
    color: "bg-orange-500/10 text-orange-600"
  }
];

export default function PlanHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser
  });

  const { skillGaps } = useCrossHubIntegration(currentUser?.id);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleNextStepClick = () => {
    setSearchParams({ tab: 'roadmap' });
    // Focus on the in-progress step - would scroll to specific element in real app
  };

  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header with Track Selector */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Plan Your Career Journey</h1>
            <p className="text-muted-foreground">
              Create strategic plans, set goals, and get AI-powered recommendations
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Track selector will be added later when the component exists */}
          </div>
        </div>

        {/* Today Dashboard */}
        <TodayDashboard onNextStepClick={handleNextStepClick} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
                <TabsTrigger value="roadmap" data-testid="tab-roadmap">Roadmap</TabsTrigger>
                <TabsTrigger value="gaps" data-testid="tab-gaps">Skill Gaps</TabsTrigger>
                <TabsTrigger value="workflows" data-testid="tab-workflows">Workflows</TabsTrigger>
                <TabsTrigger value="proof" data-testid="tab-proof">Proof Projects</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <TodayDashboard onNextStepClick={handleNextStepClick} />
                  </div>
                  <div className="space-y-4">
                    <SkillGapRecommendations compact maxGaps={3} />
                    {skillGaps.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={() => window.open('/discover?filter=skill-gaps', '_self')}
                          >
                            Find Courses for Skill Gaps
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={() => window.open('/discover?tab=mentors', '_self')}
                          >
                            Connect with Mentors
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="goals" className="mt-6">
                <EnhancedGoalDashboard userId={currentUser?.id} />
              </TabsContent>

              <TabsContent value="roadmap" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {planFeatures.filter(f => f.tab === 'roadmap').map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <Card key={feature.tab} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${feature.color}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{feature.title}</CardTitle>
                              <CardDescription>{feature.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Button className="w-full" variant="default" data-testid="cta-next-step">
                            Start Planning
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Add example roadmap content */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Your AI-Generated Roadmap</CardTitle>
                      <CardDescription>Based on your goal to become a Data Scientist</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-sm">Learn Python fundamentals (Current)</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                          <span className="text-sm text-muted-foreground">Master statistics and probability</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                          <span className="text-sm text-muted-foreground">Learn machine learning basics</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="gaps" className="mt-6">
                <SkillGapRecommendations />
              </TabsContent>

              <TabsContent value="workflows" className="mt-6">
                <GoalOrchestrator userId={currentUser?.id} />
              </TabsContent>


              <TabsContent value="proof" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {planFeatures.filter(f => f.tab === 'proof').map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <Card key={feature.tab} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${feature.color}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{feature.title}</CardTitle>
                              <CardDescription>{feature.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Button className="w-full" variant="default" data-testid="cta-next-step">
                            Plan Project
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Add example projects content */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Suggested Proof Projects</CardTitle>
                      <CardDescription>Build projects that demonstrate your skills</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Customer Churn Prediction</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Build a machine learning model to predict customer churn using historical data
                          </p>
                          <div className="flex gap-2">
                            <Badge variant="secondary">Python</Badge>
                            <Badge variant="secondary">Pandas</Badge>
                            <Badge variant="secondary">Scikit-learn</Badge>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Sales Dashboard</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Create an interactive dashboard to visualize sales trends and KPIs
                          </p>
                          <div className="flex gap-2">
                            <Badge variant="secondary">Python</Badge>
                            <Badge variant="secondary">Plotly</Badge>
                            <Badge variant="secondary">Streamlit</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Maya Guidance Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <MayaInlinePanel context="plan" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}