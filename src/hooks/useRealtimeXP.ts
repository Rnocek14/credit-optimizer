import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface XPGain {
  id: string;
  amount: number;
  reason?: string;
  source?: string;
  trackId?: string;
  timestamp: string;
}

interface LevelUp {
  newLevel: number;
  previousLevel: number;
  totalXP: number;
  trackId?: string;
}

export function useRealtimeXP() {
  const { user } = useSecureAuth();
  const { activeTrackId } = useActiveTrackStore();
  const [recentXPGains, setRecentXPGains] = useState<XPGain[]>([]);
  const [currentXP, setCurrentXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);

  // Celebration functions
  const triggerXPCelebration = useCallback((xpGain: XPGain) => {
    // Show toast notification
    toast.success(
      `+${xpGain.amount} XP earned!`,
      {
        description: xpGain.reason || 'Great progress!',
        duration: 3000,
        className: 'animate-scale-in',
      }
    );

    // Add to recent gains for UI animation
    setRecentXPGains(prev => [xpGain, ...prev.slice(0, 4)]);

    // Remove from recent gains after animation
    setTimeout(() => {
      setRecentXPGains(prev => prev.filter(gain => gain.id !== xpGain.id));
    }, 4000);
  }, []);

  const triggerLevelUpCelebration = useCallback((levelUp: LevelUp) => {
    // Big confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
    });

    // Second wave of confetti
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 300);

    // Level up toast
    toast.success(
      `🎉 Level Up! Level ${levelUp.newLevel}`,
      {
        description: `Congratulations! You've reached level ${levelUp.newLevel}`,
        duration: 5000,
        className: 'animate-scale-in border-yellow-400 bg-yellow-50 text-yellow-900',
      }
    );
  }, []);

  // Calculate level from XP
  const calculateLevel = useCallback((xp: number) => {
    if (xp < 100) return 1;
    if (xp < 250) return 2;
    if (xp < 500) return 3;
    if (xp < 1000) return 4;
    return 4 + Math.floor((xp - 500) / 500);
  }, []);

  // Set up real-time subscription for XP events
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time XP subscription for user:', user.id);

    const channel = supabase
      .channel('user-xp-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_track_xp_events',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New XP event received:', payload);
          
          const newEvent = payload.new as any;
          
          // Only show celebrations for the active track or global XP
          if (!activeTrackId || newEvent.track_id === activeTrackId || !newEvent.track_id) {
            const xpGain: XPGain = {
              id: newEvent.id,
              amount: newEvent.xp,
              reason: newEvent.reason,
              source: newEvent.source,
              trackId: newEvent.track_id,
              timestamp: newEvent.created_at,
            };

            triggerXPCelebration(xpGain);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_track_xp',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('XP total updated:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // Only track for active track
          if (newData.track_id === activeTrackId) {
            const newTotal = newData.total_xp;
            const oldTotal = oldData.total_xp || 0;
            
            const newLevel = calculateLevel(newTotal);
            const oldLevel = calculateLevel(oldTotal);
            
            setCurrentXP(newTotal);
            setCurrentLevel(newLevel);
            
            // Check for level up
            if (newLevel > oldLevel) {
              const levelUp: LevelUp = {
                newLevel,
                previousLevel: oldLevel,
                totalXP: newTotal,
                trackId: newData.track_id,
              };
              
              triggerLevelUpCelebration(levelUp);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('XP real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up XP real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeTrackId, triggerXPCelebration, triggerLevelUpCelebration, calculateLevel]);

  // Award XP function for manual triggering
  const awardXP = useCallback(async (amount: number, reason: string, source?: string) => {
    if (!user?.id || !activeTrackId) return;

    try {
      console.log(`Awarding ${amount} XP for ${reason}`);
      
      // Insert XP event directly
      const { error } = await supabase
        .from('user_track_xp_events')
        .insert({
          user_id: user.id,
          track_id: activeTrackId,
          xp: amount,
          reason,
          source,
          metadata: { timestamp: new Date().toISOString() }
        });

      if (error) {
        console.error('Error awarding XP:', error);
        toast.error('Failed to award XP');
      }
    } catch (error) {
      console.error('Error awarding XP:', error);
      toast.error('Failed to award XP');
    }
  }, [user?.id, activeTrackId]);

  return {
    recentXPGains,
    currentXP,
    currentLevel,
    awardXP,
  };
}