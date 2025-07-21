
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Target, Award, TrendingUp } from 'lucide-react';

interface SkillDetailModalProps {
  skill: {
    id: string;
    name: string;
    category: string;
    xp_value: number;
    difficulty_level: number;
    description?: string;
  } | null;
  userProgress?: {
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    xp_earned: number;
    cri_score?: number;
    verification_source?: string;
  };
  prerequisites?: Array<{
    id: string;
    name: string;
    completed: boolean;
  }>;
  open: boolean;
  onClose: () => void;
  onPlanSkill: (skillId: string) => void;
}

export const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  skill,
  userProgress,
  prerequisites = [],
  open,
  onClose,
  onPlanSkill
}) => {
  if (!skill) return null;

  const progressPercent = userProgress ? (userProgress.xp_earned / skill.xp_value) * 100 : 0;
  const canPlan = userProgress?.status === 'available' || userProgress?.status === 'in_progress';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {skill.name}
            <Badge variant="outline">
              Level {skill.difficulty_level}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {skill.category}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="prerequisites">Prerequisites</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {skill.description || 'No description available for this skill.'}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">XP Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{skill.xp_value}</div>
                  <p className="text-xs text-muted-foreground">Points earned when mastered</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Level {skill.difficulty_level}</div>
                  <p className="text-xs text-muted-foreground">
                    {skill.difficulty_level <= 2 ? 'Beginner' : 
                     skill.difficulty_level <= 4 ? 'Intermediate' : 'Advanced'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {canPlan && (
              <Button 
                onClick={() => onPlanSkill(skill.id)}
                className="w-full"
                size="lg"
              >
                <Target className="h-4 w-4 mr-2" />
                Plan This Skill with Maya
              </Button>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>XP Progress</span>
                    <span>{userProgress?.xp_earned || 0}/{skill.xp_value}</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant={
                      userProgress?.status === 'completed' ? 'default' :
                      userProgress?.status === 'in_progress' ? 'secondary' :
                      'outline'
                    }>
                      {userProgress?.status?.replace('_', ' ') || 'Available'}
                    </Badge>
                  </div>
                  
                  {userProgress?.cri_score && (
                    <div>
                      <div className="text-sm text-muted-foreground">CRI Score</div>
                      <div className="text-lg font-semibold">
                        {userProgress.cri_score.toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>

                {userProgress?.verification_source && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Verified By</div>
                    <Badge variant="outline">{userProgress.verification_source}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prerequisites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  Skills you need to master before tackling this one
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prerequisites.length === 0 ? (
                  <p className="text-muted-foreground">No prerequisites required</p>
                ) : (
                  <div className="space-y-2">
                    {prerequisites.map((prereq) => (
                      <div key={prereq.id} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${prereq.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={prereq.completed ? 'text-green-700' : 'text-muted-foreground'}>
                          {prereq.name}
                        </span>
                        {prereq.completed && (
                          <Badge variant="outline" className="ml-auto">
                            ✓ Completed
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Learning Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Recommended courses and resources will be displayed here based on your learning history and preferences.
                </p>
                <Button variant="outline" className="mt-3" disabled>
                  View Recommended Courses
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
