import { Helmet } from "react-helmet-async";
import { TodayHeroCard } from "@/components/today/TodayHeroCard";
import { TodayStatsStrip } from "@/components/today/TodayStatsStrip";
import { TodaySupportingCards } from "@/components/today/TodaySupportingCards";
import { useTodayHeroAction } from "@/hooks/useTodayHeroAction";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useGamification } from "@/hooks/useGamification";
import { useSmartTodayDashboard } from "@/hooks/useSmartTodayDashboard";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { useQuery } from "@tanstack/react-query";
import { fetchUserLevel } from "@/shared/lib/api/gamification";
import { Loader2 } from "lucide-react";

export default function TodayDashboardPage() {
  const { user, isLoading: authLoading } = useSecureAuth();
  const { activeTrackId } = useActiveTrackStore();
  const { hero, isLoading: heroLoading } = useTodayHeroAction();
  const { currentStreak, quickWins, actions } = useSmartTodayDashboard(user?.id, activeTrackId);
  const { getCurrentStreak: getGamStreak } = useGamification(user?.id);

  const { data: userLevel } = useQuery({
    queryKey: ['user-level', user?.id],
    queryFn: () => fetchUserLevel(user!.id),
    enabled: !!user?.id,
  });

  const streak = getGamStreak ? getGamStreak() : currentStreak;

  if (authLoading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
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
        </div>

        <TodayHeroCard hero={hero} isLoading={heroLoading} />

        <TodayStatsStrip
          currentLevel={userLevel?.current_level ?? 1}
          totalXP={userLevel?.total_xp ?? 0}
          currentStreak={streak}
          readinessPercent={null}
        />

        <TodaySupportingCards
          userId={user.id}
          quickWins={quickWins}
          onQuickWinAction={(win) => actions.handleQuickWinAction(win, win.actions[0])}
        />
      </div>
    </>
  );
}
