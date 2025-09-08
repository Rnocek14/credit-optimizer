import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';
import { Trophy, Star, Zap, Target, MapPin } from 'lucide-react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  celebration: {
    celebration_type: string;
    celebration_data: {
      title: string;
      message: string;
      emoji: string;
      confetti?: boolean;
      sound?: string;
    };
    trigger_data: any;
  };
}

export function CelebrationModal({ isOpen, onClose, celebration }: CelebrationModalProps) {
  const { celebration_data, celebration_type, trigger_data } = celebration;
  const { activeTrackId } = useActiveTrackStore();

  useEffect(() => {
    if (isOpen && celebration_data.confetti) {
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']
      });
    }
  }, [isOpen, celebration_data.confetti]);

  const getCelebrationIcon = () => {
    switch (celebration_type) {
      case 'level_up':
        return <Star className="h-12 w-12 text-warning" />;
      case 'streak':
        return <Zap className="h-12 w-12 text-warning" />;
      case 'badge':
        return <Trophy className="h-12 w-12 text-primary" />;
      case 'milestone':
        return <Target className="h-8 w-8 text-green-500" />;
      case 'track_milestone':
        return <MapPin className="h-8 w-8 text-blue-500" />;
      default:
        return <Trophy className="h-8 w-8 text-primary" />;
    }
  };

  const getCelebrationDetails = () => {
    switch (celebration_type) {
      case 'level_up':
        return {
          subtitle: `Level ${trigger_data?.new_level}`,
          description: "You've reached a new experience level!",
          badge: "Level Up"
        };
      case 'streak':
        return {
          subtitle: `${trigger_data?.streak_days} Days`,
          description: "Your learning consistency is paying off!",
          badge: "Streak Master"
        };
      case 'badge':
        return {
          subtitle: trigger_data?.badge_name || "New Achievement",
          description: "You've unlocked a new badge!",
          badge: "Achievement"
        };
      case 'milestone':
        return {
          subtitle: trigger_data?.milestone_name || "Milestone Reached",
          description: "You've hit an important learning milestone!",
          badge: "Milestone"
        };
      case 'track_milestone':
        return {
          subtitle: trigger_data?.milestone_name || "Track Progress",
          description: "You've reached an important milestone in your track!",
          badge: "Track Achievement"
        };
      default:
        return {
          subtitle: "Celebration",
          description: "Great job on your progress!",
          badge: "Achievement"
        };
    }
  };

  const details = getCelebrationDetails();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-lg animate-pulse" />
              <div className="relative bg-background rounded-full p-4 border-2 border-primary/20">
                {getCelebrationIcon()}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs">
              {details.badge}
            </Badge>
            <DialogTitle className="text-2xl font-bold">
              <span className="text-4xl mr-2">{celebration_data.emoji}</span>
              {celebration_data.title}
            </DialogTitle>
            <div className="text-xl font-semibold text-primary">
              {details.subtitle}
            </div>
          </div>
        </DialogHeader>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            {celebration_data.message}
          </p>
          <p className="text-sm text-muted-foreground">
            {details.description}
          </p>

          {celebration_type === 'streak' && trigger_data?.streak_days && (
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                🔥 {trigger_data.streak_days} Day Streak!
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Keep learning daily to maintain your streak
              </div>
            </div>
          )}

          {celebration_type === 'level_up' && trigger_data?.new_level && (
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                ⭐ Level {trigger_data.new_level}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Your experience is growing!
              </div>
            </div>
          )}

          {celebration_type === 'track_milestone' && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                🗺️ {trigger_data?.milestone_name || 'Track Milestone'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Great progress in your career track!
              </div>
              {trigger_data?.progress_percentage && (
                <div className="mt-3 space-y-1">
                  <Progress value={trigger_data.progress_percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    {trigger_data.progress_percentage}% track completion
                  </div>
                </div>
              )}
            </div>
          )}

          <Button onClick={onClose} className="w-full">
            Continue Learning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}