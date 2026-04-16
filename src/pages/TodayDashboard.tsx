import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { TodayHeroCard } from "@/components/today/TodayHeroCard";
import { TodayRecommendationCard } from "@/components/today/TodayRecommendationCard";
import { TodayStatsStrip } from "@/components/today/TodayStatsStrip";
import { TodaySupportingCards } from "@/components/today/TodaySupportingCards";
import { CareerContextBanner } from "@/components/CareerContextBanner";
import { useTodayHeroAction } from "@/hooks/useTodayHeroAction";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useGamification } from "@/hooks/useGamification";
import { useSmartTodayDashboard } from "@/hooks/useSmartTodayDashboard";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { useActivePlan } from "@/hooks/useActivePlan";
import { useTargetCareer } from "@/hooks/useTargetCareer";
import { useCareerReadiness } from "@/hooks/useCareerReadiness";
import { useIntelligenceLayer } from "@/hooks/useIntelligenceLayer";
import { useQuery } from "@tanstack/react-query";
import { fetchUserLevel } from "@/shared/lib/api/gamification";
import { Loader2 } from "lucide-react";

export default function TodayDashboardPage() {
  const { user, isLoading: authLoading } = useSecureAuth();
  const { activeTrackId } = useActiveTrackStore();
  const { hero, isLoading: heroLoading } = useTodayHeroAction();
  const { currentStreak, quickWins, actions } = useSmartTodayDashboard(user?.id, activeTrackId);
  const { getCurrentStreak: getGamStreak } = useGamification(user?.id);
  const { data: activePlan } = useActivePlan();
  const { data: targetCareer } = useTargetCareer(activePlan?.target_career_id);
  const { criScore } = useCareerReadiness({
    userId: user?.id,
    targetJobId: activePlan?.target_career_id ?? undefined,
    enabled: !!user?.id,
  });
  const { topRecommendation, isLoading: intelligenceLoading } = useIntelligenceLayer(user?.id, activeTrackId);

  const { data: userLevel } = useQuery({
    queryKey: ['user-level', user?.id],
    queryFn: () => fetchUserLevel(user!.id),
    enabled: !!user?.id,
  });

  const streak = getGamStreak ? getGamStreak() : currentStreak;

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Redirect to onboarding flow if user has no plan yet
  if (!activePlan && !heroLoading) {
    return <Navigate to="/get-started" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Today – Your Daily Focus | Pivot</title>
        <meta name="description" content="Your personalized daily recommendations, quick wins, and learning streak." />
        <link rel="canonical" href={`${window.location.origin}/today`} />
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Today's Focus</h1>
          <p className="text-muted-foreground">What should you do next?</p>
          <CareerContextBanner />
        </div>

        <TodayHeroCard hero={hero} isLoading={heroLoading} />

        <TodayRecommendationCard recommendation={topRecommendation} isLoading={intelligenceLoading} />

        <TodayStatsStrip
          currentLevel={userLevel?.current_level ?? 1}
          totalXP={userLevel?.total_xp ?? 0}
          currentStreak={streak}
          readinessPercent={criScore?.overall ?? null}
          targetCareerTitle={targetCareer?.title}
        />

        <TodaySupportingCards
          userId={user.id}
          quickWins={quickWins}
          onQuickWinAction={(win) => {
            const primary = win.actions?.[0];
            if (primary) actions.handleQuickWinAction(win, primary);
          }}
        />
      </div>
    </>
  );
}