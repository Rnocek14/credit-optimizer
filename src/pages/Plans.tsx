import { useState, useEffect } from "react";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, ChevronDown, ChevronRight, MessageCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { CareerProfileCard } from "@/components/CareerProfileCard";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { useTracks } from "@/hooks/useTracks";
import { TrackSelector } from "@/components/tracks/TrackSelector";
import { CareerSwitchSimulator } from "@/components/CareerSwitchSimulator";
import { LocationOptimizerDrawer } from "@/components/LocationOptimizerDrawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SavedCoursesList } from "@/components/plan/SavedCoursesList";
import { useCourseIntelligence } from "@/hooks/useCourseIntelligence";
import { trackTelemetryEvent } from "@/utils/telemetry";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import TutorialTip from '@/tutorial/TutorialTip';
import { TIPS } from '@/tutorial/tutorial-map';

interface MilestonePlan {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed';
  steps: any[];
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export default function Plans() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [isSwitchSimulatorOpen, setIsSwitchSimulatorOpen] = useState(false);
  const [isLocationOptimizerOpen, setIsLocationOptimizerOpen] = useState(false);
  const [simulatorFromTrackId, setSimulatorFromTrackId] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeTrackId, setActiveTrackId } = useActiveTrackStore();
  const { tracks, isLoading: tracksLoading } = useTracks();
  const { getCRI } = useCourseIntelligence();

  // Calculate the trackId to use for CareerProfileCard
  const trackIdToUse = activeTrackId || tracks.find(t => !t.archived)?.id || tracks[0]?.id || null;

  // Fetch CRI data for current track
  const { data: criData } = useQuery({
    queryKey: ['user-cri', trackIdToUse],
    queryFn: async () => {
      if (!trackIdToUse) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      try {
        const result = await getCRI(user.id, trackIdToUse, false);
        await trackTelemetryEvent({ task: 'plan_view', complexity: { track_id: trackIdToUse } });
        return result;
      } catch (error) {
        console.error('CRI fetch error:', error);
        return null;
      }
    },
    enabled: !!trackIdToUse
  });

  // Debug logging
  console.log('Plans.tsx Debug:', { 
    activeTrackId, 
    tracksCount: tracks.length, 
    tracksLoading, 
    tracks: tracks.map(t => ({ id: t.id, name: t.track_name, archived: t.archived }))
  });
  console.log('trackIdToUse:', trackIdToUse);

  // Show empty state if no tracks
  if (!tracksLoading && tracks.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Career Tracks Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first career track to start planning your professional journey.
              </p>
              <Button onClick={() => navigate('/mentor')} className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat with Maya
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auto-select first available track if none is selected
  React.useEffect(() => {
    if (!activeTrackId && tracks.length > 0 && !tracksLoading) {
      const firstActiveTrack = tracks.find(track => !track.archived);
      if (firstActiveTrack) {
        console.log('Auto-selecting track:', firstActiveTrack.id, firstActiveTrack.track_name);
        setActiveTrackId(firstActiveTrack.id);
      }
    }
  }, [activeTrackId, tracks, tracksLoading, setActiveTrackId]);

  // Action handlers for CareerProfileCard
  const openSwitchSimulatorWith = (trackId: string) => {
    setSimulatorFromTrackId(trackId);
    setIsSwitchSimulatorOpen(true);
  };

  const openLocationOptimizerFor = (trackId: string) => {
    setSimulatorFromTrackId(trackId);
    setIsLocationOptimizerOpen(true);
  };

  const handleLocationSelect = (locationId: string, location: any) => {
    console.log('Location selected:', locationId, location);
    // Location selection is handled by the LocationOptimizerDrawer
    setIsLocationOptimizerOpen(false);
  };

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['milestone-plans'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('milestone_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MilestonePlan[];
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, updates }: { planId: string; updates: Partial<MilestonePlan> }) => {
      const { error } = await supabase
        .from('milestone_plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-plans'] });
    }
  });

  const togglePlanExpansion = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const handleStepToggle = async (plan: MilestonePlan, stepIndex: number, completed: boolean) => {
    const updatedSteps = [...plan.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      completed,
      completed_at: completed ? new Date().toISOString() : null
    };

    const completedCount = updatedSteps.filter(step => step.completed).length;
    const completionPercentage = Math.round((completedCount / updatedSteps.length) * 100);
    
    const updates: Partial<MilestonePlan> = {
      steps: updatedSteps,
      completion_percentage: completionPercentage,
      updated_at: new Date().toISOString()
    };

    // If all steps are completed, mark plan as completed
    if (completionPercentage === 100 && plan.status === 'active') {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
      
      // Trigger celebration
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "🎉 Plan Completed!",
        description: `You've finished "${plan.title}"! Amazing progress!`,
      });
    }

    await updatePlanMutation.mutateAsync({ planId: plan.id, updates });

    if (completed) {
      toast({
        title: "Step completed!",
        description: "Great progress on your milestone plan.",
      });
    }
  };

  const filteredPlans = plans.filter(plan => plan.status === activeTab);

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">📘 Milestone Plans</h1>
            <p className="text-muted-foreground">
              Track and manage your personalized learning roadmaps
            </p>
          </div>
          {tracks.length > 0 && (
            <div className="flex items-center gap-4">
              <TrackSelector />
            </div>
          )}
        </div>
      </div>

        {/* Career Profile Card - Only render if trackIdToUse exists */}
      {trackIdToUse ? (
        <div className="mb-8">
          <CareerProfileCard 
            trackId={trackIdToUse}
            onSimulateSwitch={() => openSwitchSimulatorWith(trackIdToUse)}
            onCompareTracks={() => navigate(`/plan/compare?a=${trackIdToUse}`)}
            onOptimizeLocation={() => openLocationOptimizerFor(trackIdToUse)}
          />
        </div>
      ) : !tracksLoading && (
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>No active career track found. Please create a track first.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Saved Courses List Integration */}
      <ErrorBoundary>
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Saved Courses</h2>
            <TutorialTip 
              id="plansSavedCourses" 
              label={TIPS.plansSavedCourses} 
            />
          </div>
          <SavedCoursesList currentCRI={criData?.cri || 0} />
        </div>
      </ErrorBoundary>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'completed')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active ({plans.filter(p => p.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completed ({plans.filter(p => p.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {filteredPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Plans Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Ready to level up? Ask Maya to create your first milestone plan!
                  </p>
                  <Button onClick={() => navigate('/mentor')} className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Chat with Maya
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isExpanded={expandedPlans.has(plan.id)}
                  onToggleExpansion={() => togglePlanExpansion(plan.id)}
                  onStepToggle={(stepIndex, completed) => handleStepToggle(plan, stepIndex, completed)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {filteredPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Plans Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Complete your first milestone plan to see it here!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isExpanded={expandedPlans.has(plan.id)}
                  onToggleExpansion={() => togglePlanExpansion(plan.id)}
                  onStepToggle={(stepIndex, completed) => handleStepToggle(plan, stepIndex, completed)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Test celebration button */}
      {plans.length > 0 && (
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={triggerCelebration}
            className="text-xs"
          >
            🎉 Test Celebration
          </Button>
        </div>
      )}

      {/* Career Switch Simulator Modal */}
      <Dialog open={isSwitchSimulatorOpen} onOpenChange={setIsSwitchSimulatorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <CareerSwitchSimulator 
            defaultFromTrackId={simulatorFromTrackId}
            onClose={() => setIsSwitchSimulatorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Location Optimizer Drawer */}
      <LocationOptimizerDrawer
        isOpen={isLocationOptimizerOpen}
        onClose={() => setIsLocationOptimizerOpen(false)}
        fromTrackId={simulatorFromTrackId}
        toTrackId={tracks.find(t => t.id !== simulatorFromTrackId && !t.archived)?.id || tracks.filter(t => !t.archived && t.id !== simulatorFromTrackId)[0]?.id}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
}

interface PlanCardProps {
  plan: MilestonePlan;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onStepToggle: (stepIndex: number, completed: boolean) => void;
}

function PlanCard({ plan, isExpanded, onToggleExpansion, onStepToggle }: PlanCardProps) {
  const completedSteps = plan.steps.filter(step => step.completed).length;
  const totalSteps = plan.steps.length;
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpansion}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-3 mb-2">
                  <span className="text-lg">📘</span>
                  <span className="text-lg">{plan.title}</span>
                  <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'}>
                    {plan.status}
                  </Badge>
                </CardTitle>
                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                )}
                
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {completedSteps} of {totalSteps} steps completed
                    </span>
                    <span className="font-medium">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    Created {format(parseISO(plan.created_at), 'MMM d, yyyy')}
                    {plan.completed_at && (
                      <> • Completed {format(parseISO(plan.completed_at), 'MMM d, yyyy')}</>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Steps to Complete
              </h4>
              
              {plan.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={step.completed || false}
                    onCheckedChange={(checked) => onStepToggle(index, checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${step.completed ? 'text-muted-foreground line-through' : ''}`}>
                      {step.title || step.text || `Step ${index + 1}`}
                    </p>
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    )}
                    {step.completed && step.completed_at && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Completed {format(parseISO(step.completed_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}