import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, LogIn, Trophy, User, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIPlanningEngineTest } from "@/components/AIPlanningEngineTest";
import { SemanticVisualQATest } from "@/components/SemanticVisualQATest";
import { Phase1TestPanel } from "@/components/Phase1TestPanel";

interface DemoProfile {
  user_id: string;
  name: string;
  email: string;
  resume_id: string;
  created_at: string;
  slug: string | null;
  total_xp: number;
  current_level: number;
  earned_badges: any; // JSONB type from Supabase
}

export default function Demos() {
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchDemoProfiles();
  }, []);

  const fetchDemoProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_demo_resume_profiles');
      
      if (error) {
        console.error('Error fetching demo profiles:', error);
        toast({
          title: "Error loading demo profiles",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Demo profiles data:', data);
      setProfiles(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load demo profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewResume = (userId: string) => {
    // Navigate using user_id instead of resume_id
    navigate(`/resume/${userId}`);
  };

  const handleLoginAsUser = async (userId: string, userEmail: string) => {
    try {
      // Set dev user info for development login
      (window as any).__devUser__ = { id: userId, email: userEmail, role: 'user' };
      localStorage.setItem('devUserId', userId);
      localStorage.setItem('devUserEmail', userEmail);
      
      toast({
        title: "Dev Login",
        description: `Logged in as ${userEmail}`,
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error with dev login:', error);
      toast({
        title: "Error",
        description: "Failed to set dev login",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">Demo User Profiles</h1>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-32 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Demo User Profiles</h1>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Demo Profiles Found</h3>
            <p className="text-muted-foreground">
              No demo users with published resumes are available at this time.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Demo User Profiles & Test Suite</h1>
          <p className="text-muted-foreground">
            Explore our demo accounts and run validation tests
          </p>
        </div>

        {/* Phase 1 + Smart Goals Test Section */}
        <div className="mb-8">
          <Phase1TestPanel />
        </div>

        <Separator className="my-8" />

        {/* AI Planning Engine Test Section */}
        <div className="mb-8">
          <AIPlanningEngineTest />
        </div>

        <Separator className="my-8" />

        {/* Semantic Visual QA Test Section */}
        <div className="mb-8">
          <SemanticVisualQATest />
        </div>

        <Separator className="my-8" />

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Demo User Profiles</h2>
          <p className="text-muted-foreground">
            Explore our demo accounts to see how the platform works
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <Card key={profile.user_id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{profile.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Demo User</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* XP and Level */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      Level {profile.current_level}
                    </span>
                    <span className="text-muted-foreground">
                      {profile.total_xp} XP
                    </span>
                  </div>
                  <Progress 
                    value={getProgressPercentage(profile.total_xp, profile.current_level)} 
                    className="h-2"
                  />
                </div>

                {/* Earned Badges */}
                {profile.earned_badges && profile.earned_badges.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Earned Badges</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.earned_badges.map((badge) => (
                        <Tooltip key={badge.id}>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-lg p-1 cursor-help">
                              {badge.emoji}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{badge.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Earned {new Date(badge.earned_at).toLocaleDateString()}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => handleViewResume(profile.user_id)}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Resume
                  </Button>
                  
                  {/* Dev Tools - Only show in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoginAsUser(profile.user_id, profile.email)}
                      className="w-full"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Login as this user
                    </Button>
                  )}
                </div>

                {/* Email for reference */}
                <p className="text-xs text-muted-foreground text-center">
                  {profile.email}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );

  function getProgressPercentage(currentXp: number, level: number) {
    // Calculate XP needed for current level and next level
    let xpForCurrentLevel = 0;
    let xpForNextLevel = 100;
    
    if (level >= 2) xpForCurrentLevel = 100;
    if (level >= 3) xpForCurrentLevel = 250;
    if (level >= 4) xpForCurrentLevel = 500;
    if (level >= 5) xpForCurrentLevel = 500 + ((level - 5) * 500);
    
    if (level === 1) xpForNextLevel = 100;
    else if (level === 2) xpForNextLevel = 250;
    else if (level === 3) xpForNextLevel = 500;
    else if (level === 4) xpForNextLevel = 1000;
    else xpForNextLevel = 500 + ((level - 4) * 500);
    
    const progressInLevel = currentXp - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
    
    return Math.min(100, Math.max(0, (progressInLevel / xpNeededForLevel) * 100));
  }
}
