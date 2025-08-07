import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useUserExperienceLevel } from "@/hooks/useUserExperienceLevel";
import { useUserJourney } from "@/contexts/UserJourneyContext";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import OnboardingConfirmation from "@/components/OnboardingConfirmation";
import { MayaOnboarding } from "@/components/MayaOnboarding";
import { AdaptiveDashboard } from "@/components/AdaptiveDashboard";
import SecureLandingPage from "@/components/SecureLandingPage";
import SecurityMonitor from "@/components/SecurityMonitor";
import { HubNavigation } from "@/components/HubNavigation"; // Fixed import
import { EnhancedMayaDemo } from "@/components/EnhancedMayaDemo";
import { RoadmapTester } from "@/components/RoadmapTester";
import { getCurrentUser } from "@/lib/authHelper";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Target, BookOpen, Users } from "lucide-react";
import { useEffect } from "react";
import { checkRateLimit, generateRateLimitKey } from "@/lib/security";

export default function Index() {
  const { user, isLoading: authLoading } = useSecureAuth();
  const { 
    isNewUser, 
    isLoading: experienceLoading,
    completeOnboarding,
    updateExperienceLevel 
  } = useUserExperienceLevel();
  
  const { state: journeyState } = useUserJourney();

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
  if (isNewUser || !journeyState.preferences.onboardingComplete) {
    return (
      <MayaOnboarding 
        onComplete={() => {
          completeOnboarding();
          // Navigate to adaptive dashboard
        }}
      />
    );
  }

  // Authenticated users with completed onboarding get the adaptive dashboard
  if (journeyState.preferences.onboardingComplete) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">
                Welcome back{journeyState.user?.email ? `, ${journeyState.user.email.split('@')[0]}` : ''}! 👋
              </h1>
              <p className="text-muted-foreground">
                Ready to continue your career journey?
              </p>
            </div>
            <AdaptiveDashboard />
          </div>
        </div>
      </>
    );
  }

  // Fallback to original landing page
  return (
    <>
      <SecurityMonitor />
      <HubNavigation />
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
              <Button asChild size="lg" variant="gradient" className="w-full sm:w-auto">
                <Link to="/plan-hub">
                  Start Planning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/explore-hub">
                  Explore Careers
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/history-hub">
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


