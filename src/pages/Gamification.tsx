import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { GamificationDashboard } from '@/components/GamificationDashboard';
import { CelebrationModal } from '@/components/CelebrationModal';
import { useGamification } from '@/hooks/useGamification';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function Gamification() {
  const [selectedCelebration, setSelectedCelebration] = useState<any>(null);
  const { getUnreadCelebrations, markCelebrationDisplayed } = useGamification();

  const unreadCelebrations = getUnreadCelebrations();

  // Auto-show unread celebrations
  useEffect(() => {
    if (unreadCelebrations.length > 0 && !selectedCelebration) {
      const latestCelebration = unreadCelebrations[0];
      setSelectedCelebration(latestCelebration);
      // Mark as displayed when shown
      markCelebrationDisplayed.mutate(latestCelebration.id);
    }
  }, [unreadCelebrations, selectedCelebration, markCelebrationDisplayed]);

  const handleCelebrationClick = (celebration: any) => {
    setSelectedCelebration(celebration);
    if (!celebration.displayed_at) {
      markCelebrationDisplayed.mutate(celebration.id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🎮 Gamification Hub</h1>
              <p className="text-muted-foreground">
                Track your learning achievements, streaks, and progress
              </p>
            </div>
            
            {unreadCelebrations.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="animate-pulse">
                  {unreadCelebrations.length} new celebration{unreadCelebrations.length > 1 ? 's' : ''}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => handleCelebrationClick(unreadCelebrations[0])}
                >
                  View Latest 🎉
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full lg:w-[400px] grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <GamificationDashboard />
          </TabsContent>

          <TabsContent value="streaks" className="space-y-6">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">🔥 Streak Analytics</h3>
              <p className="text-muted-foreground mb-4">
                Detailed streak analysis and prediction features coming soon
              </p>
              <Button variant="outline" disabled>
                Advanced Streak Features
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">👥 Social Learning</h3>
              <p className="text-muted-foreground mb-4">
                Share achievements and encourage peers - coming soon
              </p>
              <Button variant="outline" disabled>
                Social Features
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Celebration Modal */}
      {selectedCelebration && (
        <CelebrationModal
          isOpen={!!selectedCelebration}
          onClose={() => setSelectedCelebration(null)}
          celebration={selectedCelebration}
        />
      )}
    </div>
  );
}