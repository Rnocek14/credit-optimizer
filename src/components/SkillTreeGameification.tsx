import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, Zap, Calendar, Award, Flame, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

interface SkillTreeGameificationProps {
  userLevel: number;
  totalXP: number;
  xpForNextLevel: number;
  currentLevelXP: number;
  streakDays: number;
  skillsCompleted: number;
  achievements: Achievement[];
  className?: string;
  onClaimReward?: () => void;
  showMini?: boolean;
}

const LEVEL_BENEFITS = [
  { level: 1, benefit: "Skill Tree Explorer", description: "Access to basic features" },
  { level: 2, benefit: "Progress Tracker", description: "Advanced analytics unlocked" },
  { level: 3, benefit: "Goal Setter", description: "Career planning tools" },
  { level: 4, benefit: "Skill Master", description: "Mentor chat & recommendations" },
  { level: 5, benefit: "Learning Legend", description: "Premium resources & priority support" },
];

export const SkillTreeGameification: React.FC<SkillTreeGameificationProps> = ({
  userLevel,
  totalXP,
  xpForNextLevel,
  currentLevelXP,
  streakDays,
  skillsCompleted,
  achievements,
  className,
  onClaimReward,
  showMini = false
}) => {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  const levelProgress = currentLevelXP > 0 ? (currentLevelXP / (xpForNextLevel - currentLevelXP + currentLevelXP)) * 100 : 0;
  const earnedAchievements = achievements.filter(a => a.earned);
  const nextBenefit = LEVEL_BENEFITS.find(b => b.level === userLevel + 1);

  // Check for new achievements
  useEffect(() => {
    const recent = achievements.filter(a => 
      a.earned && a.earnedAt && 
      Date.now() - new Date(a.earnedAt).getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    setNewAchievements(recent);
  }, [achievements]);

  // Level up animation trigger
  useEffect(() => {
    if (userLevel > 1) {
      setShowLevelUp(true);
      const timer = setTimeout(() => setShowLevelUp(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [userLevel]);

  if (showMini) {
    return (
      <div className={cn("flex items-center gap-4 p-3 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50", className)}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {userLevel}
          </div>
          <div className="text-sm">
            <div className="font-medium">Level {userLevel}</div>
            <div className="text-xs text-muted-foreground">{totalXP} XP</div>
          </div>
        </div>
        
        <div className="flex-1 max-w-32">
          <Progress value={levelProgress} className="h-1.5" />
        </div>
        
        {streakDays > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-medium">{streakDays}</span>
          </div>
        )}
        
        <Badge variant="secondary" className="text-xs">
          {earnedAchievements.length} badges
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Level Up Celebration */}
      {showLevelUp && (
        <Card className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 animate-pulse">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <div className="font-bold text-lg text-yellow-800">Level Up!</div>
            <div className="text-sm text-yellow-700">You've reached Level {userLevel}!</div>
            {nextBenefit && (
              <div className="text-xs text-yellow-600 mt-1">
                Next: {nextBenefit.benefit}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {userLevel}
              </div>
              <div>
                <CardTitle className="text-lg">Level {userLevel}</CardTitle>
                <CardDescription>
                  {totalXP.toLocaleString()} XP • {earnedAchievements.length} achievements
                </CardDescription>
              </div>
            </div>
            
            {onClaimReward && (
              <Button variant="outline" size="sm" onClick={onClaimReward}>
                <Trophy className="h-4 w-4 mr-2" />
                Claim Reward
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* XP Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Level {userLevel + 1}</span>
              <span className="font-medium">{currentLevelXP}/{xpForNextLevel} XP</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
            {nextBenefit && (
              <div className="text-xs text-muted-foreground">
                Next unlock: {nextBenefit.benefit} - {nextBenefit.description}
              </div>
            )}
          </div>

          <Separator />

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Streak</span>
              </div>
              <div className="text-xl font-bold text-orange-600">{streakDays}</div>
              <div className="text-xs text-muted-foreground">days</div>
            </div>
            
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Skills</span>
              </div>
              <div className="text-xl font-bold text-green-600">{skillsCompleted}</div>
              <div className="text-xs text-muted-foreground">completed</div>
            </div>
            
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Award className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Badges</span>
              </div>
              <div className="text-xl font-bold text-purple-600">{earnedAchievements.length}</div>
              <div className="text-xs text-muted-foreground">earned</div>
            </div>
          </div>

          {/* Recent Achievements */}
          {newAchievements.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Recent Achievements
                </div>
                <div className="space-y-2">
                  {newAchievements.slice(0, 3).map(achievement => (
                    <div key={achievement.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-lg">{achievement.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{achievement.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {achievement.description}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        New!
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Daily Challenge
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};