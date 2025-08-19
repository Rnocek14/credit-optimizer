import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap, Trophy, Star, Target } from 'lucide-react';
import { useRealtimeXP } from '@/hooks/useRealtimeXP';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';

export function XPCelebrationOverlay() {
  const { recentXPGains } = useRealtimeXP();
  const { activeTrack } = useActiveTrackStore();

  if (recentXPGains.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      {recentXPGains.map((gain, index) => (
        <div
          key={gain.id}
          className={`
            flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg
            animate-slide-in-right
            ${index > 0 ? 'opacity-80' : ''}
          `}
          style={{
            animationDelay: `${index * 100}ms`,
            transform: `translateY(${index * 4}px)`,
          }}
        >
          <div className="flex items-center gap-2">
            {gain.amount >= 50 ? (
              <Trophy className="h-4 w-4 text-yellow-300" />
            ) : gain.amount >= 20 ? (
              <Star className="h-4 w-4 text-yellow-300" />
            ) : (
              <Zap className="h-4 w-4 text-yellow-300" />
            )}
            <span className="font-bold">+{gain.amount} XP</span>
            {activeTrack && (
              <Target className="h-3 w-3 text-blue-300" />
            )}
          </div>
          
          <div className="flex gap-1">
            {gain.reason && (
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-none">
                {gain.reason}
              </Badge>
            )}
            {activeTrack && (
              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-100 border-none">
                {activeTrack.track_name}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}