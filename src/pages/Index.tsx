import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Target, BookOpen, Users } from "lucide-react";
import { RoadmapTester } from '@/components/RoadmapTester';
import { EnhancedMayaDemo } from '@/components/EnhancedMayaDemo';
import RoleBasedNavigation from "@/components/RoleBasedNavigation";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import { useUserExperienceLevel } from "@/hooks/useUserExperienceLevel";
import SecureLandingPage from "@/components/SecureLandingPage";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import SecurityMonitor from "@/components/SecurityMonitor";
import { useEffect } from "react";
import { checkRateLimit, generateRateLimitKey } from "@/lib/security";

const Index = () => {
  const { user, isLoading, hasPermission } = useSecureAuth();
  const { isNewUser, completeOnboarding, updateExperienceLevel } = useUserExperienceLevel();

  useEffect(() => {
    // Rate limiting for home page access
    const rateLimitKey = generateRateLimitKey(user?.id || 'anonymous', 'home_page_access');
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      console.warn('[Security] Rate limit exceeded for home page access');
    }
    
    // Log page access
    console.log('[Security] Home page access', {
      timestamp: new Date().toISOString(),
      authenticated: !!user,
      userId: user?.id || 'anonymous'
    });
  }, [user]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show secure landing page for unauthenticated users
  if (!user) {
    return (
      <>
        <SecurityMonitor />
        <SecureLandingPage />
      </>
    );
  }

  // Show onboarding for new users
  if (user && isNewUser) {
    return (
      <>
        <SecurityMonitor />
        <OnboardingWelcome 
          onExperienceLevelSelect={updateExperienceLevel}
          onComplete={completeOnboarding}
        />
      </>
    );
  }

  // Show full content for authenticated users
  return (
    <>
      <SecurityMonitor />
      <RoleBasedNavigation />
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
                <Link to="/auth">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link to="/resume-gallery">
                Browse Resume Gallery
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link to="/discover">
                Discover Featured Talent
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link to="/demos">
                View Demo Accounts
              </Link>
            </Button>
            {hasPermission('admin') && (
              <Button variant="secondary" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/workflows">
                  🔬 Test Maya Workflows
                </Link>
              </Button>
            )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              <div className="text-center space-y-3 md:space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
              </div>
                <h3 className="text-lg md:text-xl font-semibold">Create Your Profile</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  Tell us about your background, skills, and career goals through our comprehensive onboarding form.
                </p>
              </div>
              <div className="text-center space-y-3 md:space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <Target className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
              </div>
                <h3 className="text-lg md:text-xl font-semibold">Get AI Recommendations</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  Our AI analyzes your profile and generates personalized career tracks and learning paths.
                </p>
              </div>
              <div className="text-center space-y-3 md:space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
              </div>
                <h3 className="text-lg md:text-xl font-semibold">Follow Your Roadmap</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  Track your progress through structured learning steps designed specifically for your goals.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Maya Intelligence Demo Section */}
        <div className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Experience Maya's Universal Intelligence</h2>
                <p className="text-muted-foreground">
                  Try our AI-powered career intelligence system that provides real-time market insights, 
                  autonomous workflow creation, and personalized career guidance.
                </p>
              </div>
              <EnhancedMayaDemo />
            </div>
          </div>
        </div>

        {/* Developer Testing Section - Admin Only */}
        {hasPermission('admin') && (
          <div className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8">Developer Testing</h2>
                <RoadmapTester />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Index;
