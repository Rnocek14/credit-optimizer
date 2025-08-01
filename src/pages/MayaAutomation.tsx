import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { MayaAutonomousIntelligence } from "@/components/MayaAutonomousIntelligence";
import { CRIRecommendationEngine } from "@/components/CRIRecommendationEngine";
import { SmartGoalSetting } from "@/components/SmartGoalSetting";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";
import { LoadingState } from "@/components/LoadingState";
import { AlertTriangle, BookOpen, Target, Brain, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MayaAutomation() {
  const [activeTab, setActiveTab] = useState("intelligence");
  
  // Mock user ID for demo - in real app this would come from auth
  const userId = "2b458624-d498-4cca-a63d-9341cc20e363";
  const mockSkillGaps = ["React", "Node.js", "TypeScript", "AWS", "Docker"];

  return (
    <>
      <Helmet>
        <title>Maya Automation Dashboard - Phase 9A Enhanced - PathfindAI</title>
        <meta name="description" content="Advanced AI automation dashboard with real course data integration, smart goal setting, and career simulation." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="container mx-auto px-4 py-8">
          {/* Phase 9A Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Maya Automation Dashboard</h1>
                <p className="text-muted-foreground">Phase 9A: Smart Goal Setting & Career Simulation</p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                Real Course Data
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Real Courses</p>
                      <p className="text-2xl font-bold">1,500+</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">AI Goals</p>
                      <p className="text-2xl font-bold">Smart</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Market Data</p>
                      <p className="text-2xl font-bold">Live</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Simulations</p>
                      <p className="text-2xl font-bold">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <UnifiedDataProvider>
            <ErrorBoundary>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="intelligence" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Maya Intelligence
                  </TabsTrigger>
                  <TabsTrigger value="goals" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Smart Goals
                  </TabsTrigger>
                  <TabsTrigger value="courses" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Course Engine
                  </TabsTrigger>
                  <TabsTrigger value="simulation" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Career Sim
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="intelligence" className="space-y-6">
                  <MayaAutonomousIntelligence />
                </TabsContent>

                <TabsContent value="goals" className="space-y-6">
                  <SmartGoalSetting userId={userId} currentCRI={73} />
                </TabsContent>

                <TabsContent value="courses" className="space-y-6">
                  <CRIRecommendationEngine 
                    userId={userId} 
                    targetCRI={85} 
                    skillGaps={mockSkillGaps}
                  />
                </TabsContent>

                <TabsContent value="simulation" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Career Simulation Engine
                        <Badge variant="outline">Coming in Week 2</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">Career "What-If" Scenarios</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Compare different career paths, simulate skill development timelines, 
                          and predict market opportunities based on real data.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">Path Comparison</h4>
                            <p className="text-muted-foreground">
                              Compare Data Analyst vs Data Scientist career trajectories
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">Timeline Simulation</h4>
                            <p className="text-muted-foreground">
                              See how skill acquisition affects career advancement
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">Risk Assessment</h4>
                            <p className="text-muted-foreground">
                              Identify career stability and pivot opportunities
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </ErrorBoundary>
          </UnifiedDataProvider>
        </div>
      </div>
    </>
  );
}

// Error boundary component for production resilience
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Maya Automation Dashboard Error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-md mx-auto mt-16">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Dashboard Error</h3>
                <p className="text-muted-foreground">
                  There was an issue loading the automation dashboard. Please try refreshing the page.
                </p>
              </div>
              <Button 
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}