import { HubNavigation } from "@/components/HubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight, BookOpen, AlertTriangle, DollarSign, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useActivePlan } from "@/hooks/useActivePlan";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";

export default function PlanHub() {
  const { data: activePlan, isLoading: planLoading } = useActivePlan();

  // Fetch plan course stats if user has an active plan
  const { data: planStats } = useQuery({
    queryKey: ['plan-stats', activePlan?.id],
    queryFn: async () => {
      if (!activePlan?.id) return null;
      const { data, error } = await supabase
        .from('user_plan_courses')
        .select('id, status, credits_earned, cost_paid')
        .eq('plan_id', activePlan.id);
      if (error) throw error;
      const courses = data ?? [];
      return {
        totalCourses: courses.length,
        completed: courses.filter(c => c.status === 'complete').length,
        enrolled: courses.filter(c => c.status === 'enrolled').length,
        planned: courses.filter(c => c.status === 'planned').length,
        totalCredits: courses.reduce((sum, c) => sum + (c.credits_earned ?? 0), 0),
        totalCost: courses.reduce((sum, c) => sum + (c.cost_paid ?? 0), 0),
      };
    },
    enabled: !!activePlan?.id,
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Degree Plan – Your Saved Plan | PathfindAI</title>
        <meta name="description" content="Manage your degree plan, track credits, costs, and progress toward graduation." />
        <link rel="canonical" href={`${window.location.origin}/plan`} />
      </Helmet>
      <HubNavigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Degree Plan</h1>
          <p className="text-muted-foreground">
            Your saved degree plan and progress toward graduation
          </p>
        </div>

        {planLoading ? (
          <Card className="animate-pulse">
            <CardHeader><div className="h-6 bg-muted rounded w-1/2" /></CardHeader>
            <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
          </Card>
        ) : activePlan ? (
          <div className="space-y-6">
            {/* Active Plan Summary */}
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{activePlan.name}</CardTitle>
                      <CardDescription>Active degree plan</CardDescription>
                    </div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {planStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{planStats.totalCourses}</p>
                      <p className="text-sm text-muted-foreground">Courses</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{planStats.completed}</p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-center gap-1">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <p className="text-2xl font-bold">{planStats.totalCredits}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">Credits</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <p className="text-2xl font-bold">${planStats.totalCost.toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">Spent</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="flex-1">
                    <Link to={`/edu-tree-v6?planId=${activePlan.id}`}>
                      Open Planner
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/edu-tree-v5/marketplace">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Browse Templates
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Empty State — No Plan Yet */
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-6">
                <GraduationCap className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No degree plan yet</h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                Browse optimized degree templates, compare costs and transfer policies, then build your personalized path to graduation.
              </p>
              <Button asChild size="lg">
                <Link to="/edu-tree-v5/marketplace">
                  Browse Degree Templates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
