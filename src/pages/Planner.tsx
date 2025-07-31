import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { PlannerJobInput } from "@/components/PlannerJobInput";
import { PlannerPathDisplay } from "@/components/PlannerPathDisplay";
import { PlannerUnlockPreview } from "@/components/PlannerUnlockPreview";
import { useAIPlanningEngine, type LearningPath } from "@/hooks/useAIPlanningEngine";
import { useAnalytics } from "@/lib/analytics";

const Planner = () => {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [user, setUser] = useState<any>(null);
  const { loading, error, suggestions = [], generateBackwardPlan } = useAIPlanningEngine();
  const { trackPlannerGeneratePlan } = useAnalytics();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleGeneratePlan = async (targetJob: string) => {
    const paths = await generateBackwardPlan(targetJob);
    setLearningPaths(paths);

    // Track analytics
    if (user) {
      trackPlannerGeneratePlan(user.id, {
        target_job: targetJob,
        paths_generated: paths.length
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              🧠 Plan Your Next Career Move with AI
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Generate personalized learning roadmaps based on your dream job, current skills, and ROI optimization.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Input */}
          <div className="lg:col-span-1">
            <PlannerJobInput 
              onGeneratePlan={handleGeneratePlan}
              loading={loading}
              error={error}
              suggestions={suggestions}
            />
            
            {/* Unlock Analysis Preview */}
            <div className="mt-6">
              <PlannerUnlockPreview userId={user?.id} />
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            <PlannerPathDisplay 
              learningPaths={learningPaths}
              loading={loading}
              userId={user?.id}
            />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 <span>ROI Optimization</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Find learning paths with the highest return on investment for your career goals.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚡ <span>Fast Track Options</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Discover the quickest paths to reach your target role with minimal time investment.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💰 <span>Budget-Friendly Routes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Explore cost-effective learning strategies that fit your budget constraints.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Planner;