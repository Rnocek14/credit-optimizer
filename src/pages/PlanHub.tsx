import { HubNavigation } from "@/components/HubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, Calendar, TrendingUp, Map, Users, FileText, CheckSquare, Brain, Calculator, Wrench } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { TrackSelector } from "@/components/tracks/TrackSelector";
import { TrackDisplay } from "@/components/tracks/TrackDisplay";
import MayaInlinePanel from "@/components/maya/MayaInlinePanel";
import { TodayDashboard } from "@/components/TodayDashboard";
import { SkillGapRecommendations } from "@/components/SkillGapRecommendations";
import { EnhancedGoalDashboard } from "@/components/EnhancedGoalDashboard";
import { GoalOrchestrator } from "@/components/GoalOrchestrator";
import { RecommendationFeed } from "@/components/reco/RecommendationFeed";
import { TrackProofProjectManager } from "@/components/proof-projects/TrackProofProjectManager";
import { CareerSwitchSimulator } from "@/components/CareerSwitchSimulator";
import { CareerProfileCard } from "@/components/CareerProfileCard";
import { LocationOptimizerDrawer } from "@/components/LocationOptimizerDrawer";
import { MayaIntelligencePanel } from "@/components/MayaIntelligencePanel";
import { MayaTransparencyOverlay } from "@/components/MayaTransparencyOverlay";
import { useSkillGaps } from "@/hooks/useSkillGaps";
import { useUnifiedRecommendations } from "@/hooks/useUnifiedRecommendations";
import { EnhancedErrorBoundary } from "@/components/enhanced/EnhancedErrorBoundary";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { useTracks } from "@/hooks/useTracks";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/authHelper";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useMayaContextTracking } from "@/hooks/useMayaContextTracking";

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
  },
  {
    title: "Career Switch Analyzer",
    description: "Analyze career transitions and calculate ROI",
    tab: "switch",
    icon: Calculator,
    color: "bg-teal-500/10 text-teal-600"
  }
];

export default function PlanHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { trackPageVisit, trackTimeSpent } = useMayaContextTracking();
  
  // Career profile card state
  const { activeTrackId, setActiveTrackId } = useActiveTrackStore();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLocationOptimizerOpen, setIsLocationOptimizerOpen] = useState(false);
  
  // Auto-select first track if none is active
  const { tracks, isLoading: tracksLoading } = useTracks();
  
  useEffect(() => {
    if (!activeTrackId && !tracksLoading && tracks?.length > 0) {
      const firstNonArchivedTrack = tracks.find(track => !track.archived);
      if (firstNonArchivedTrack) {
        console.log('PlanHub: Auto-selecting first track:', firstNonArchivedTrack.id);
        setActiveTrackId(firstNonArchivedTrack.id);
      }
    }
  }, [activeTrackId, tracks, tracksLoading, setActiveTrackId]);

  console.log('PlanHub render start:', { activeTab, activeTrackId });

  // Track Maya context for plan page visits
  useEffect(() => {
    trackPageVisit('/plan', { 
      tab: activeTab, 
      trackId: activeTrackId,
      timestamp: new Date().toISOString() 
    });

    // Track time spent when component unmounts or tab changes
    return () => {
      trackTimeSpent('/plan');
    };
  }, [activeTab, activeTrackId, trackPageVisit, trackTimeSpent]);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      console.log('PlanHub: Fetching user data');
      const user = await getCurrentUser();
      console.log('PlanHub: User fetched:', user?.id);
      return user;
    }
  });

  const { data: skillGaps = [] } = useSkillGaps(currentUser?.id);
  console.log('PlanHub: Skill gaps state:', { 
    hasSkillGaps: !!skillGaps, 
    skillGapsCount: skillGaps?.length
  });

  const { data: recommendations = [] } = useUnifiedRecommendations(currentUser?.id);
  console.log('PlanHub: Recommendations state:', { 
    recCount: recommendations?.length
  });

  console.log('PlanHub render complete:', { 
    user: currentUser?.id, 
    activeTab, 
    hasSkillGaps: !!skillGaps, 
    hasRecommendations: !!recommendations
  });

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleNextStepClick = () => {
    // Use first recommendation if available
    const firstReco = recommendations[0];
    if (firstReco?.actions[0]?.href) {
      window.location.href = firstReco.actions[0].href;
    } else {
      setSearchParams({ tab: 'roadmap' });
    }
  };

  // Career profile card handlers
  const handleSimulateSwitch = () => {
    setIsSimulatorOpen(true);
  };

  const handleExportResume = async () => {
    if (!activeTrackId) {
      toast({ title: 'No track selected', description: 'Please select a career track first.' });
      return;
    }

    try {
      // Get the career profile data from the query cache (same data the card shows)
      const profile = queryClient.getQueryData(['career-profile-card', activeTrackId]) as any;
      
      if (!profile) {
        toast({ title: 'Profile data loading', description: 'Please wait for the career profile to load completely.' });
        return;
      }

      const resumeData = {
        exportedAt: new Date().toISOString(),
        trackId: profile.trackId,
        trackTitle: profile.trackTitle || 'Career Track',
        criScore: profile.criScore || 0,
        criLevel: profile.criLevel || 'Beginner',
        switchReadiness: profile.switchReadiness || 0,
        riskLevel: profile.riskLevel || 'Unknown',
        overallRisk: profile.overallRisk || 0,
        lqi: profile.lqi || 0,
        roi3yr: profile.roi3yr || 0,
        breakEvenMonths: profile.breakEvenMonths || 0,
        ranking: profile.ranking || 0
      };

      const blob = new Blob([JSON.stringify(resumeData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `career-profile-${resumeData.trackTitle.replace(/\s+/g, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Resume exported', description: 'Career profile data has been downloaded as JSON.' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Export failed', description: 'Unable to export resume data. Please try again.' });
    }
  };

  const handleCompareTracks = () => {
    if (!activeTrackId) return;
    navigate(`/plan/compare?a=${activeTrackId}`);
  };

  const handleOptimizeLocation = () => {
    setIsLocationOptimizerOpen(true);
  };

  const handleLocationSelect = (locationId: string, location: any) => {
    setIsLocationOptimizerOpen(false);
    // Location selection logic here
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
            <TrackSelector className="text-foreground" />
            {/* Build Tracks CTA (desktop/tablet) */}
            <div className="hidden sm:flex">
              <Button asChild variant="default" className="gap-2">
                <Link to="/build" aria-label="Open Track Builder">
                  <Wrench className="h-4 w-4" />
                  Build Tracks
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Track Display - Shows active track information */}
        <TrackDisplay className="mb-6" />

        {/* Today Dashboard - Now integrated in Overview tab */}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
                <TabsTrigger value="roadmap" data-testid="tab-roadmap">Roadmap</TabsTrigger>
                <TabsTrigger value="gaps" data-testid="tab-gaps">Skill Gaps</TabsTrigger>
                <TabsTrigger value="workflows" data-testid="tab-workflows">Workflows</TabsTrigger>
                <TabsTrigger value="proof" data-testid="tab-proof">Proof Projects</TabsTrigger>
                <TabsTrigger value="switch" data-testid="tab-switch">Career Switch</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                {/* Career Profile Card */}
                {activeTrackId && (
                  <EnhancedErrorBoundary>
                    <CareerProfileCard
                      trackId={activeTrackId}
                      onSimulateSwitch={handleSimulateSwitch}
                      onExportResume={handleExportResume}
                      onCompareTracks={handleCompareTracks}
                      onOptimizeLocation={handleOptimizeLocation}
                    />
                  </EnhancedErrorBoundary>
                )}
                
                {/* Today Dashboard */}
                <EnhancedErrorBoundary>
                  <TodayDashboard 
                    onNextStepClick={handleNextStepClick} 
                  />
                </EnhancedErrorBoundary>
                
                {/* Unified Recommendation Feed */}
                <EnhancedErrorBoundary>
                  <RecommendationFeed userId={currentUser?.id} className="mt-6" />
                </EnhancedErrorBoundary>
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
                         <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                           <div className="w-2 h-2 bg-primary rounded-full"></div>
                           <span className="text-sm">Learn Python fundamentals (Current)</span>
                         </div>
                         <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                           <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                           <span className="text-sm text-muted-foreground">Master statistics and probability</span>
                         </div>
                         <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
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
                <TrackProofProjectManager />
              </TabsContent>

              <TabsContent value="switch" className="mt-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Career Switch Analyzer</h2>
                    <p className="text-muted-foreground mb-6">
                      Analyze potential career transitions, calculate ROI, and understand switching costs and risks.
                    </p>
                  </div>
                  <CareerSwitchSimulator />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Maya Guidance Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <MayaIntelligencePanel 
                currentPath="/plan" 
                contextData={{ activeTab: activeTab, tracksCount: tracks?.length || 0 }}
                compact={true}
              />
              <MayaInlinePanel context="plan" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile FAB to open Builder */}
      <Link
        to="/build"
        aria-label="Open Track Builder"
        className="
          sm:hidden fixed right-4 bottom-4 z-40
          inline-flex items-center justify-center
          h-12 w-12 rounded-full shadow-lg
          bg-primary text-primary-foreground
          hover:opacity-90 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary
        "
      >
        <Wrench className="h-5 w-5" />
      </Link>

      {/* Career Switch Simulator Modal */}
      <Dialog open={isSimulatorOpen} onOpenChange={setIsSimulatorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Career Switch Simulator</DialogTitle>
          </DialogHeader>
          <CareerSwitchSimulator 
            defaultFromTrackId={activeTrackId || undefined}
            onClose={() => setIsSimulatorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Location Optimizer Drawer */}
      <LocationOptimizerDrawer
        isOpen={isLocationOptimizerOpen}
        onClose={() => setIsLocationOptimizerOpen(false)}
        fromTrackId={activeTrackId || undefined}
        toTrackId={tracks?.find(t => t.id !== activeTrackId && !t.archived)?.id}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
}