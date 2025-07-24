
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Target, BookOpen, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import ProgressBar from "@/components/ProgressBar";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { ResumePreview } from "@/components/ResumePreview";
import ResumeAnalyticsDashboard from "@/components/ResumeAnalyticsDashboard";
import { CareerGraphTest } from "@/components/CareerGraphTest";
import { OrphanedNodeReconnector } from "@/components/OrphanedNodeReconnector";
import { AICareerGraphManager } from "@/components/AICareerGraphManager";
import { getCurrentUser, getUserProfile } from "@/lib/authHelper";
import type { Tables } from "@/integrations/supabase/types";

type CareerTrack = Tables<"career_tracks">;
type RoadmapStep = Tables<"roadmap_steps">;

export default function Dashboard() {
  const [careerTracks, setCareerTracks] = useState<CareerTrack[]>([]);
  const [roadmapSteps, setRoadmapSteps] = useState<RoadmapStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Use the new auth helper to get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view your dashboard",
          variant: "destructive",
        });
        return;
      }

      // Get user's profile using the auth helper
      const profile = await getUserProfile(currentUser.id, currentUser.isDevUser);
      if (!profile) {
        toast({
          title: "Profile Not Found",
          description: "Please complete your onboarding first",
          variant: "destructive",
        });
        return;
      }

      // Fetch career tracks and roadmap steps
      const [tracksResponse, stepsResponse] = await Promise.all([
        supabase
          .from("career_tracks")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("roadmap_steps")
          .select("*")
          .eq("user_id", profile.id)
          .order("order_index", { ascending: true }),
      ]);

      if (tracksResponse.error) throw tracksResponse.error;
      if (stepsResponse.error) throw stepsResponse.error;

      setCareerTracks(tracksResponse.data);
      setRoadmapSteps(stepsResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load your dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStepCompletion = async (stepId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("roadmap_steps")
        .update({
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null,
        })
        .eq("id", stepId);

      if (error) throw error;

      setRoadmapSteps(steps =>
        steps.map(step =>
          step.id === stepId
            ? {
                ...step,
                completed: !completed,
                completed_at: !completed ? new Date().toISOString() : null,
              }
            : step
        )
      );

      toast({
        title: completed ? "Step uncompleted" : "Step completed!",
        description: completed ? "Keep working on it!" : "Great progress!",
      });
    } catch (error) {
      console.error("Error updating step:", error);
      toast({
        title: "Error",
        description: "Failed to update step completion",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const completedSteps = roadmapSteps.filter(step => step.completed).length;

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-6 md:py-8">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Your Career Dashboard
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Track your progress and follow your personalized roadmap
              </p>
            </div>
            <DashboardSkeleton />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Your Career Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Track your progress and follow your personalized roadmap
            </p>
          </div>

          {/* Progress Overview */}
          {roadmapSteps.length > 0 && (
            <ProgressBar completed={completedSteps} total={roadmapSteps.length} />
          )}

          {/* Career Tracks */}
          {careerTracks.length > 0 && (
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-semibold mb-4 flex items-center gap-2">
              <Target className="h-6 w-6" />
              Recommended Career Tracks
            </h2>
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {careerTracks.map((track) => (
                <Card key={track.id}>
                  <CardHeader>
                    <CardTitle>{track.title}</CardTitle>
                    <CardDescription>{track.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {track.reasoning && (
                      <div>
                        <p className="text-sm font-medium mb-1">Why this track:</p>
                        <p className="text-sm text-muted-foreground">{track.reasoning}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      {track.time_to_proficiency && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{track.time_to_proficiency}</span>
                        </div>
                      )}
                      {track.growth_potential && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{track.growth_potential}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Roadmap Steps */}
          {roadmapSteps.length > 0 && (
            <div>
              <h2 className="text-xl md:text-2xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Your Learning Roadmap
            </h2>
            <div className="space-y-3 md:space-y-4">
              {roadmapSteps.map((step, index) => (
                <Card key={step.id} className={step.completed ? "opacity-75" : ""}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <Checkbox
                          checked={step.completed || false}
                          onCheckedChange={() =>
                            toggleStepCompletion(step.id, step.completed || false)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                        <div>
                          <div className="space-y-1 md:space-y-2">
                            <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                              <span className="text-muted-foreground text-xs md:text-sm">
                                #{index + 1}
                              </span>
                              {step.title}
                              {step.completed && (
                                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                              )}
                            </h3>
                            {step.description && (
                              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {step.priority && (
                              <Badge variant={getPriorityColor(step.priority)}>
                                {step.priority}
                              </Badge>
                            )}
                            {step.category && (
                              <Badge variant="outline">{step.category}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm">
                          {step.timeline && (
                            <div>
                              <span className="font-medium">Timeline:</span>
                              <p className="text-muted-foreground">{step.timeline}</p>
                            </div>
                          )}
                          {step.estimated_duration && (
                            <div>
                              <span className="font-medium">Duration:</span>
                              <p className="text-muted-foreground">{step.estimated_duration}</p>
                            </div>
                          )}
                          {step.success_metrics && (
                            <div>
                              <span className="font-medium">Success Metrics:</span>
                              <p className="text-muted-foreground">{step.success_metrics}</p>
                            </div>
                          )}
                        </div>

                        {step.prerequisites && step.prerequisites.length > 0 && (
                          <div>
                            <span className="font-medium text-sm">Prerequisites:</span>
                            <div className="flex flex-wrap gap-1 mt-1 md:mt-2">
                              {step.prerequisites.map((prereq, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                  {prereq}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          )}

          {careerTracks.length === 0 && roadmapSteps.length === 0 && (
            <Card>
              <CardContent className="text-center py-8 md:py-12">
                <BookOpen className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-base md:text-lg font-semibold mb-2">No roadmap found</h3>
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                It looks like your roadmap is still being generated or there was an issue.
              </p>
              <Button onClick={fetchData}>
                <Loader2 className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              </CardContent>
            </Card>
          )}

          {/* Analytics Dashboard */}
          <div className="mt-8">
            <ResumeAnalyticsDashboard />
          </div>

          {/* Career Graph Test Suite */}
          <div className="mt-8">
            <CareerGraphTest />
            <OrphanedNodeReconnector />
            <AICareerGraphManager />
          </div>

          {/* Resume Preview for Aisha Khan */}
          <div className="mt-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Resume Preview</h2>
            <ResumePreview userId="2b458624-d498-4cca-a63d-9341cc20e363" />
          </div>
        </div>
      </div>
    </>
  );
}
