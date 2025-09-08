import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  Clock, 
  CheckCircle, 
  Plus,
  Settings,
  Calendar,
  TrendingUp,
  BookOpen,
  Trophy,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import TrackSelector from "@/components/tracks/TrackSelector";
import { TrackManager } from "@/components/multi-track/TrackManager";
import { TrackPlanningView } from "@/components/plan/TrackPlanningView";
import { getCurrentUser } from "@/lib/auth";
import { QUERY_KEYS } from "@/lib/queryKeys";

interface PlanItem {
  id: string;
  title: string;
  description?: string;
  item_type: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  estimated_time_to_complete?: string;
  skill_tags: string[];
  cri_boost_score?: number;
  added_from_hub: string;
  created_at: string;
}

interface MicroGoal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  completed_at?: string;
  source_item_id?: string;
  created_at: string;
}

export default function Plan() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeTrackId = useActiveTrackStore(s => s.activeTrackId);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE(),
    queryFn: getCurrentUser,
  });

  // Fetch plan items
  const { data: planItems = [], isLoading: isLoadingPlan } = useQuery({
    queryKey: QUERY_KEYS.PLAN_ITEMS(currentUser?.id, activeTrackId),
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data, error } = await supabase
        .from('saved_plan_items')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlanItem[];
    },
    enabled: !!currentUser?.id
  });

  // Fetch micro goals
  const { data: microGoals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: QUERY_KEYS.MICRO_GOALS(currentUser?.id, activeTrackId),
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data, error } = await supabase
        .from('micro_goals')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MicroGoal[];
    },
    enabled: !!currentUser?.id
  });

  // Update item status mutation
  const updateItemStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const { error } = await supabase
        .from('saved_plan_items')
        .update({ status })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLAN_ITEMS(currentUser?.id, activeTrackId) });
      toast({ title: "Item status updated!" });
    }
  });

  // Complete micro goal mutation
  const completeMicroGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('micro_goals')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', goalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MICRO_GOALS(currentUser?.id, activeTrackId) });
      toast({ title: "Micro-goal completed!" });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'course': return <BookOpen className="h-4 w-4" />;
      case 'career_path': return <Target className="h-4 w-4" />;
      case 'project': return <Trophy className="h-4 w-4" />;
      case 'skill': return <Zap className="h-4 w-4" />;
      default: return <Plus className="h-4 w-4" />;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Please log in</h2>
            <p className="text-muted-foreground mb-4">You need to be logged in to view your plan.</p>
            <Button onClick={() => window.location.href = '/auth'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              🎯 <span>My Learning Plan</span>
            </h1>
            <p className="text-muted-foreground">
              Organize and track your learning journey with personalized goals and milestones
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTrackId && (
              <span className="text-xs px-2 py-1 rounded bg-muted">
                Track: {activeTrackId.slice(0,8)}
              </span>
            )}
            <TrackManager />
            <TrackSelector />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
            <TabsTrigger value="overview" className="text-sm md:text-base">📋 Overview</TabsTrigger>
            <TabsTrigger value="planning" className="text-sm md:text-base">🎯 Planning</TabsTrigger>
            <TabsTrigger value="roadmap" className="text-sm md:text-base">🗺️ Roadmap</TabsTrigger>
            <TabsTrigger value="goals" className="text-sm md:text-base">🎯 Micro Goals</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{planItems.length}</p>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {planItems.filter(item => item.status === 'in_progress').length}
                      </p>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {planItems.filter(item => item.status === 'completed').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Plan Items */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your Plan Items</h2>
              
              {isLoadingPlan ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : planItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No items in your plan yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start exploring courses and save items to build your learning plan
                    </p>
                    <Button onClick={() => window.location.href = '/explore'}>
                      <Plus className="h-4 w-4 mr-2" />
                      Explore Courses
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {planItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getItemIcon(item.item_type)}
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">{item.title}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className={getPriorityColor(item.priority)}>
                                  {item.priority}
                                </Badge>
                                <Badge variant="outline">
                                  {item.item_type}
                                </Badge>
                                <span className={getStatusColor(item.status)}>
                                  {item.status.replace('_', ' ')}
                                </span>
                                {item.estimated_time_to_complete && (
                                  <span className="text-muted-foreground">
                                    ⏱️ {item.estimated_time_to_complete}
                                  </span>
                                )}
                                {item.cri_boost_score && item.cri_boost_score > 0 && (
                                  <span className="text-green-600">
                                    ⚡ +{Math.round(item.cri_boost_score)}% CRI
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemStatus.mutate({
                                  itemId: item.id,
                                  status: item.status === 'pending' ? 'in_progress' : 'completed'
                                })}
                              >
                                {item.status === 'pending' ? 'Start' : 'Complete'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Planning Tab */}
          <TabsContent value="planning" className="space-y-6">
            <TrackPlanningView />
          </TabsContent>

          {/* Roadmap Tab */}
          <TabsContent value="roadmap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning Roadmap</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Visual roadmap view coming soon - track your learning journey with interactive timelines and milestones.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Micro Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Micro Goals</h2>
              
              {isLoadingGoals ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : microGoals.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No micro goals yet</h3>
                    <p className="text-muted-foreground">
                      Micro goals are automatically created when you save items to your plan
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {microGoals.map((goal) => (
                    <Card key={goal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <CheckCircle className={`h-5 w-5 ${goal.completed_at ? 'text-green-600' : 'text-muted-foreground'}`} />
                            <div className="flex-1">
                              <h3 className={`font-semibold ${goal.completed_at ? 'line-through text-muted-foreground' : ''}`}>
                                {goal.title}
                              </h3>
                              {goal.description && (
                                <p className="text-sm text-muted-foreground">
                                  {goal.description}
                                </p>
                              )}
                              {goal.target_date && (
                                <p className="text-xs text-muted-foreground">
                                  Target: {new Date(goal.target_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          {!goal.completed_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeMicroGoal.mutate(goal.id)}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}