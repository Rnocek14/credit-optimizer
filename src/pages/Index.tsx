
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useUserExperienceLevel } from "@/hooks/useUserExperienceLevel";
import { useUserJourney } from "@/contexts/UserJourneyContext";
import { useJourneyStore } from "@/stores/journeyStore";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import OnboardingConfirmation from "@/components/OnboardingConfirmation";
import { MayaOnboarding } from "@/components/MayaOnboarding";
import { AdaptiveDashboard } from "@/components/AdaptiveDashboard";
import SecureLandingPage from "@/components/SecureLandingPage";
import SecurityMonitor from "@/components/SecurityMonitor";
// HubNavigation now provided by AppShell at route level
import { EnhancedMayaDemo } from "@/components/EnhancedMayaDemo";
import { RoadmapTester } from "@/components/RoadmapTester";
import { getCurrentUser } from "@/lib/authHelper";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Target, BookOpen, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { checkRateLimit, generateRateLimitKey } from "@/lib/security";

export default function Index() {
  const { user, isLoading: authLoading, hasPermission } = useSecureAuth();
  const { 
    isNewUser, 
    isLoading: experienceLoading,
    completeOnboarding,
    updateExperienceLevel,
    preferences 
  } = useUserExperienceLevel();
  
  const { state: journeyState } = useUserJourney();
  const { initializeFromUser, stage } = useJourneyStore();
  
  // Use a ref to track if we've already initialized to prevent infinite loops
  const hasInitialized = useRef(false);

  // Initialize journey store when user data is available
  useEffect(() => {
    if (user && preferences && !hasInitialized.current) {
      console.log('🔄 Initializing journey store for user:', user.id);
      
      const userPermissions = {
        admin: hasPermission("admin"),
        institution: hasPermission("admin"),
        employer: hasPermission("admin"),
        teach: hasPermission("mentor") || hasPermission("admin")
      };
      
      initializeFromUser(preferences.hasCompletedOnboarding, userPermissions);
      hasInitialized.current = true;
    }
  }, [user?.id, preferences?.hasCompletedOnboarding]); // Only depend on stable values

  // Reset initialization flag when user changes
  useEffect(() => {
    if (!user) {
      hasInitialized.current = false;
    }
  }, [user]);

  if (authLoading || experienceLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <SecureLandingPage />;
  }

  // Maya-powered onboarding for new users
  // Check both systems for onboarding completion status
  const needsOnboarding = isNewUser && !journeyState.preferences.onboardingComplete;
  
  if (needsOnboarding) {
    return (
      <MayaOnboarding 
        onComplete={() => {
          console.log('🎯 Onboarding completed, triggering state sync...');
          completeOnboarding();
          
          // Force re-render by updating journey state
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }}
      />
    );
  }

  // Authenticated users with completed onboarding get redirected to Today Dashboard for demo
  if (preferences?.hasCompletedOnboarding) {
    return <Navigate to="/today" replace />;
  }

  // Fallback to original landing page
  return (
    <>
      <SecurityMonitor />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center p-4 md:p-8 min-h-[60vh]">
          <div className="text-center space-y-4 md:space-y-6 max-w-4xl">
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-foreground">
              AI-Powered Career Roadmaps
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Get personalized career guidance powered by AI. Create your profile and receive a custom roadmap to achieve your professional goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Button asChild size="lg" variant="gradient" className="w-full sm:w-auto" data-testid="cta-start-planning">
                <Link to="/plan">
                  Start Planning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/discover">
                  Explore Careers
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/progress">
                  View Progress
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
