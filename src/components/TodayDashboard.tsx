import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Target, TrendingUp, Zap, Users, BookOpen, Award, Flame, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { useSmartTodayDashboard } from '@/hooks/useSmartTodayDashboard';
import { useCRIEngine } from '@/hooks/useCRIEngine';
import { useGamification } from '@/hooks/useGamification';
import { CRIBoostChip } from '@/components/ui/cri-boost-chip';
import { MayaInsightsCard } from '@/components/dashboard/MayaInsightsCard';
import { CRIScoreDisplay } from '@/components/dashboard/CRIScoreDisplay';
import { DailyChallengeCard } from '@/components/dashboard/DailyChallengeCard';
import { EnhancedStreakCard } from '@/components/dashboard/EnhancedStreakCard';
import { useFeatureFlags } from '@/lib/featureFlags';
import { seedTodayDemoData } from '@/utils/seedTodayDemoData';
import { useToast } from '@/hooks/use-toast';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { awardXP } from '@/lib/xpUtils';
import { logEvent } from '@/lib/analytics';
import CelebrationOverlay from '@/components/gamification/CelebrationOverlay';
import { XPToast } from '@/components/gamification/XPToast';
import AchievementGallery from '@/components/gamification/AchievementGallery';
import StreakTimeline from '@/components/gamification/StreakTimeline';
import { useCelebrations } from '@/hooks/useCelebrations';
import { useGamificationData } from '@/hooks/useGamificationData';
import DiagnosticsRunner from '@/components/DiagnosticsRunner';
import { OnboardingTutorial, useOnboarding } from '@/components/onboarding/OnboardingTutorial';
import { useMayaContextTracking } from '@/hooks/useMayaContextTracking';
import { MayaIntelligencePanel } from '@/components/MayaIntelligencePanel';
import { MayaInsightDebugPanel } from '@/components/debug/MayaInsightDebugPanel';
import { DbHealthBadge } from '@/components/DbHealthBadge';
import { AlternativeCoursesList } from '@/components/AlternativeCoursesList';

interface TodayDashboardProps {
  onNextStepClick?: () => void;
}

export function TodayDashboard({ onNextStepClick }: TodayDashboardProps) {
  const { unifiedTodayDashboard, gamificationCelebrations, gamificationGallery, gamificationTimeline, altCoursesEnabled, skillTreeForceTagsFallback } = useFeatureFlags();
  
  // Debug feature flags for Alternative Courses
  console.log('[TodayDashboard] flags:', { altCoursesEnabled, skillTreeForceTagsFallback });
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Use secure authentication with proper session management
  const { user, isLoading: authLoading, hasPermission } = useSecureAuth();
  
  // All hooks must be called before any conditional returns to maintain consistent hook order
  const {
    nextStep,
    quickWins,
    currentStreak,
    unstickData,
    isLoading: smartDashboardLoading,
    actions
  } = useSmartTodayDashboard(user?.id);

  const { getCurrentStreak, getLongestStreak, metrics } = useGamification(user?.id);
  const { data: userLevel } = useQuery({
    queryKey: ['user-level', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.rpc('get_user_level', { user_id_param: user.id });
      return data?.[0] || null;
    },
    enabled: !!user?.id
  });

  // Gamification state
  const [xpToasts, setXpToasts] = React.useState<{ id: string; text: string }[]>([]);
  const { badges, days } = useGamificationData(user?.id);
  const { open, setOpen, title, subtitle, kind } = useCelebrations({
    currentLevel: userLevel?.current_level,
    previousLevel: undefined, // We don't track previous level yet
    currentStreak: getCurrentStreak ? getCurrentStreak() : currentStreak,
  });

  // Activate Maya context tracking
  const {
    trackPageVisit,
    trackTimeSpent,
    trackCourseInteraction,
    trackGoalProgress,
    trackMilestone,
    trackEngagement
  } = useMayaContextTracking();
  
  // Auth diagnostics for development
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔐 TodayDashboard Auth State:', {
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isDevUser: user.isDevUser
        } : null,
        authLoading,
        hasUser: !!user,
        userId: user?.id
      });
    }
  }, [user, authLoading]);
  
  // Loading and auth states - render conditionally but keep hooks consistent
  const isAuthLoading = authLoading;
  const hasUser = !!user;

  // Track page visit when component mounts
  React.useEffect(() => {
    trackPageVisit('/today', { 
      user_level: userLevel?.current_level,
      current_streak: getCurrentStreak ? getCurrentStreak() : currentStreak,
      total_xp: userLevel?.total_xp
    });
  }, [trackPageVisit, userLevel, getCurrentStreak, currentStreak]);

  // Feature flag state - no early return
  const hasUnifiedDashboard = unifiedTodayDashboard;

  const handleNextStepClick = (actionIndex = 0) => {
    if (!nextStep || !nextStep.actions[actionIndex]) return;
    
    actions.handleNextStepAction(nextStep.actions[actionIndex]);
    
    if (onNextStepClick) {
      onNextStepClick();
    }
  };

  const pushXPToast = (xp: number) => {
    setXpToasts((q) => [...q, { id: crypto.randomUUID(), text: `+${xp} XP` }]);
  };

  const handleChallengeComplete = async (challengeId: string, xpAwarded: number) => {
    if (!user.id) return;
    
    try {
      await awardXP(user.id, xpAwarded, 'LEARNING_SESSION', 'Completed daily challenge');
      pushXPToast(xpAwarded);
      logEvent('xp_awarded', { source: 'daily_challenge', xp: xpAwarded, challengeId });
      
      // Track milestone with Maya
      trackMilestone('daily_challenge_complete', { 
        challenge_id: challengeId, 
        xp_awarded: xpAwarded,
        current_streak: getCurrentStreak ? getCurrentStreak() : currentStreak
      });
      
      toast({
        title: "Challenge Complete! 🎉",
        description: `You earned ${xpAwarded} XP!`,
      });
      
      // Refresh user level data
      queryClient.invalidateQueries({ queryKey: ['user-level', user.id] });
    } catch (error) {
      console.error('Error awarding challenge XP:', error);
    }
  };

  // Mock focus skills for display
  const focusSkills = [
    { name: 'React Hooks', progress: 75, level: 'Advanced' },
    { name: 'TypeScript', progress: 60, level: 'Intermediate' },
    { name: 'Node.js', progress: 45, level: 'Beginner' }
  ];

  console.log('TodayDashboard render:', { userId: user?.id, isLoading: smartDashboardLoading, nextStep: !!nextStep, quickWins: quickWins?.length });

  // Determine what to render based on state - no early returns to maintain hook order
  const shouldShowAuthLoading = isAuthLoading;
  const shouldShowAuthRequired = !hasUser;
  const shouldShowFeatureFallback = !hasUnifiedDashboard;
  const shouldShowDataLoading = smartDashboardLoading && hasUser;
  const shouldShowMainDashboard = hasUser && hasUnifiedDashboard && !smartDashboardLoading;

  // Auth loading state
  if (shouldShowAuthLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="md:col-span-2 lg:col-span-1 animate-pulse" data-testid="auth-loading">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sign-in required state
  if (shouldShowAuthRequired) {
    return (
      <Card className="border-destructive" data-testid="auth-required">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Please sign in to view your personalized dashboard and track your progress.
          </p>
          <Button onClick={() => window.location.href = '/auth'} className="w-full">
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Feature flag fallback
  if (shouldShowFeatureFallback) {
    return (
      <Card className="border-primary" data-testid="today-dashboard-fallback">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Today's Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Today's recommendations are being prepared. Check back soon for personalized suggestions!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Data loading state
  if (shouldShowDataLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="md:col-span-2 lg:col-span-1 animate-pulse" data-testid="next-step-skeleton">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-pulse" data-testid="quick-wins-skeleton">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dev Banner for Alternative Courses */}
      {(altCoursesEnabled || skillTreeForceTagsFallback) && (
        <div className="mb-2 rounded-md border border-dashed p-2 text-xs bg-primary/5 border-primary/20">
          <span className="font-medium text-primary">Dev Flags →</span>{' '}
          alt_courses:{String(altCoursesEnabled)} | skill_fallback:{String(skillTreeForceTagsFallback)}
        </div>
      )}
      
      {/* Maya Intelligence Overview - Full Width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MayaInsightsCard 
          userName={user.name || user.email?.split('@')[0] || 'there'}
          currentStreak={getCurrentStreak ? getCurrentStreak() : currentStreak}
          nextStep={nextStep}
          recommendations={quickWins}
        />
        <div className="flex flex-col gap-4">
          <MayaIntelligencePanel 
            currentPath="/today"
            contextData={{ 
              user_level: userLevel?.current_level,
              current_streak: getCurrentStreak ? getCurrentStreak() : currentStreak,
              total_xp: userLevel?.total_xp,
              daily_context: true
            }}
            compact={true}
          />
          <div className="flex justify-center">
            <DbHealthBadge />
          </div>
        </div>
        <MayaInsightDebugPanel />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CRI Score Display */}
        <CRIScoreDisplay 
          userId={user.id}
          onImproveClick={() => window.location.href = '/cri'}
        />

        {/* Daily Challenge */}
        <DailyChallengeCard 
          currentStreak={getCurrentStreak ? getCurrentStreak() : currentStreak}
          userId={user.id}
          onChallengeComplete={handleChallengeComplete}
        />

        {/* Enhanced Streak Card */}
        <EnhancedStreakCard 
          currentStreak={getCurrentStreak ? getCurrentStreak() : currentStreak}
          longestStreak={getLongestStreak ? getLongestStreak() : 0}
          totalXP={userLevel?.total_xp || 0}
          currentLevel={userLevel?.current_level || 1}
          weeklyGoalProgress={75}
        />

        {/* Smart Next Step Card */}
         <Card className="md:col-span-2 lg:col-span-1 border-l-4 border-l-primary" data-testid="next-step-card">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Target className="h-5 w-5 text-primary" />
               Next Step
             </CardTitle>
           </CardHeader>
          <CardContent className="space-y-4">
            {nextStep ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{nextStep.title}</h3>
                     {nextStep.criBoost && nextStep.criBoost > 0 && (
                       <CRIBoostChip 
                         boostPercentage={nextStep.criBoost}
                         explanation={nextStep.criExplanation}
                         size="sm"
                       />
                     )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {nextStep.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{nextStep.timeEstimate || 'Quick task'}</span>
                  </div>
                  <Badge variant={
                    nextStep.type === 'skill_gap' ? 'destructive' :
                    nextStep.type === 'maya_action' ? 'default' :
                    nextStep.type === 'market_alert' ? 'secondary' : 'outline'
                  }>
                    {nextStep.type.replace('_', ' ')}
                  </Badge>
                </div>

                 {nextStep.progress && (
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm">
                       <span>Progress</span>
                       <span>{nextStep.progress}%</span>
                     </div>
                     <Progress 
                       value={nextStep.progress} 
                       className="h-2"
                       role="progressbar"
                       aria-valuenow={nextStep.progress}
                       aria-valuemin={0}
                       aria-valuemax={100}
                       aria-label={`${nextStep.title} progress: ${nextStep.progress}%`}
                     />
                   </div>
                 )}

                <div className="flex gap-2">
                  {nextStep.actions.slice(0, 2).map((action, index) => (
                     <Button 
                       key={index}
                       onClick={() => handleNextStepClick(index)}
                       variant={index === 0 ? 'default' : 'outline'}
                       className="flex-1"
                       data-testid={`next-step-action-${index}`}
                       aria-label={`${action.label} for ${nextStep.title}`}
                     >
                       {action.label}
                     </Button>
                  ))}
                </div>
              </>
             ) : (
               <div className="text-center py-8 text-muted-foreground" data-testid="empty-recommendations">
                 <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                 <p>No recommendations available</p>
                 <p className="text-sm">Check back later for personalized suggestions</p>
               </div>
             )}
          </CardContent>
        </Card>

        {/* Focus Skills Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Focus Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {focusSkills.map((skill, index) => (
                <div key={skill.name} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div>
                    <p className="font-medium text-sm">{skill.name}</p>
                    <p className="text-xs text-muted-foreground">{skill.level}</p>
                  </div>
                   <div className="text-right">
                     <p className="text-sm font-medium">{skill.progress}%</p>
                     <Progress 
                       value={skill.progress} 
                       className="h-1 w-16"
                       role="progressbar"
                       aria-valuenow={skill.progress}
                       aria-valuemin={0}
                       aria-valuemax={100}
                       aria-label={`${skill.name} progress: ${skill.progress}%`}
                     />
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Smart Quick Wins Card */}
        <Card data-testid="quick-wins-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickWins.length > 0 ? (
                quickWins.map((win, index) => (
                  <div key={win.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{win.title}</p>
                         {win.criBoost && win.criBoost > 0 && (
                           <CRIBoostChip 
                             boostPercentage={win.criBoost}
                             explanation={win.criExplanation || "CRI boost applied"}
                             size="sm"
                           />
                         )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{win.description}</p>
                      <p className="text-xs text-muted-foreground">{win.timeEstimate}</p>
                    </div>
                     <Button 
                       size="sm" 
                       variant="ghost"
                       onClick={() => actions.handleQuickWinAction(win, win.actions[0])}
                       data-testid={`quick-win-${index}`}
                       aria-label={`Start ${win.title} (${win.timeEstimate})`}
                     >
                       Start
                     </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No quick wins available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

         {/* Smart Progress & Streak Card */}
         <Card data-testid="learning-streak">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Award className="h-5 w-5 text-purple-500" />
               Progress
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="text-center">
                 <div className="flex items-center justify-center mb-2">
                   <Flame className="h-5 w-5 text-orange-500" data-testid="streak-icon" />
                 </div>
                 <p className="text-2xl font-bold">{currentStreak} day streak</p>
                 <p className="text-xs text-muted-foreground">Consistent Learner</p>
               </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
            </div>
            
             {unstickData && (
               <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30" data-testid="unstick-prompt">
                 <div className="flex items-center gap-2 mb-2">
                   <AlertCircle className="h-4 w-4 text-orange-600" />
                   <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                     Been away for a while? {unstickData.daysSinceActivity} days since your last activity
                   </p>
                 </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={actions.handleUnstickAction}
                    data-testid="unstick-button"
                    aria-label="Get me unstuck"
                  >
                    Get me unstuck
                  </Button>
               </div>
             )}
            
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Weekly Goal</span>
                <span>75%</span>
              </div>
              <Progress value={75} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                2 more sessions this week
              </p>
            </div>

        {process.env.NODE_ENV !== 'production' && user && currentStreak === 0 && (
              <div className="pt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await seedTodayDemoData();
                      toast({ title: 'Demo data seeded', description: 'Refresh applied to your Today dashboard.' });
                      // Refresh gamification queries
                      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEARNING_STREAKS(undefined, undefined) });
                      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CELEBRATION_MOMENTS(undefined, undefined) });
                      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMIFICATION_DATA(undefined, undefined) });
                    } catch (e: any) {
                      toast({ title: 'Seeding failed', description: e.message || 'Please sign in first.', variant: 'destructive' });
                    }
                  }}
                >
                  Seed demo data for Today
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unstick Prompt - Standalone if needed */}
        {unstickData && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <div className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30" data-testid="unstick-prompt">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-medium text-orange-800 dark:text-orange-200">
                    Welcome back! Ready to get unstuck?
                  </h3>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                  It's been {unstickData.daysSinceActivity} days since your last activity. Let's get you back on track with a quick win.
                </p>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={actions.handleUnstickAction}
                  data-testid="unstick-button"
                  aria-label="Get me unstuck"
                >
                  Get me unstuck
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo Data Seeding */}
        {process.env.NODE_ENV !== 'production' && user && currentStreak === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6 text-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await seedTodayDemoData();
                    toast({ title: 'Demo data seeded', description: 'Refresh applied to your Today dashboard.' });
                    // Refresh gamification queries
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEARNING_STREAKS(undefined, undefined) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CELEBRATION_MOMENTS(undefined, undefined) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMIFICATION_DATA(undefined, undefined) });
                  } catch (e: any) {
                    toast({ title: 'Seeding failed', description: e.message || 'Please sign in first.', variant: 'destructive' });
                  }
                }}
              >
                Seed demo data for Today
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Alternative Courses Section */}
        {/* Alternative Courses Section */}
        {altCoursesEnabled && (
          <div className="md:col-span-2 lg:col-span-3" data-testid="alternative-courses">
            <AlternativeCoursesList />
          </div>
        )}
        
        {/* Gamification Features */}
        {gamificationTimeline && (
          <div className="md:col-span-2 lg:col-span-3">
            <StreakTimeline days={days} />
          </div>
        )}

        {gamificationGallery && (
          <div className="md:col-span-2 lg:col-span-3">
            <AchievementGallery badges={badges} />
          </div>
        )}

        {/* System Diagnostics - Only show in development */}
        {import.meta.env.DEV && (
          <div className="md:col-span-2 lg:col-span-3">
            <DiagnosticsRunner />
          </div>
        )}
      </div>

      {/* Gamification Overlays */}
      {gamificationCelebrations && (
        <CelebrationOverlay
          open={open}
          onClose={() => setOpen(false)}
          title={title}
          subtitle={subtitle}
          kind={kind}
        />
      )}

      <XPToast queue={xpToasts} />
      
      {/* Onboarding Tutorial */}
      {showOnboarding && (
        <OnboardingTutorial
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}
    </div>
  );
}