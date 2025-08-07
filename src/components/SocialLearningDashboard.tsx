import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Trophy, Star, TrendingUp, Calendar, Target } from 'lucide-react';
import { useSocialLearning } from '@/hooks/useSocialLearning';
import { useGamification } from '@/hooks/useGamification';

interface SocialLearningDashboardProps {
  userId: string;
}

export function SocialLearningDashboard({ userId }: SocialLearningDashboardProps) {
  const { 
    studyGroups, 
    challenges, 
    socialMetrics, 
    loadingGroups, 
    loadingChallenges,
    joinGroup,
    joinChallenge 
  } = useSocialLearning(userId);

  const { getCurrentStreak, getLongestStreak } = useGamification(userId);

  const currentStreak = getCurrentStreak();
  const longestStreak = getLongestStreak();

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/10 text-green-600';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-600';
      case 'advanced': return 'bg-red-500/10 text-red-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-600';
      case 'active': return 'bg-green-500/10 text-green-600';
      case 'completed': return 'bg-gray-500/10 text-gray-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Social Learning Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Study Groups</p>
                <p className="text-2xl font-bold">{socialMetrics?.total_groups_joined || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Challenges Completed</p>
                <p className="text-2xl font-bold">{socialMetrics?.challenges_completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Peer Rating</p>
                <p className="text-2xl font-bold">{socialMetrics?.average_peer_rating.toFixed(1) || '0.0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Collaboration Score</p>
                <p className="text-2xl font-bold">{Math.round(socialMetrics?.collaboration_score || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="groups">Study Groups</TabsTrigger>
          <TabsTrigger value="challenges">Learning Challenges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Available Study Groups
              </CardTitle>
              <CardDescription>
                Join study groups to collaborate with peers and accelerate your learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingGroups ? (
                <div className="text-center py-8">Loading study groups...</div>
              ) : studyGroups && studyGroups.length > 0 ? (
                <div className="grid gap-4">
                  {studyGroups.map((group) => (
                    <Card key={group.id} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="font-semibold">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{group.career_path}</Badge>
                              <Badge variant="outline">{group.group_type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {group.member_count}/{group.max_members} members
                              </span>
                            </div>
                            {group.skill_focus && group.skill_focus.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {group.skill_focus.map((skill, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => joinGroup.mutate(group.id)}
                            disabled={group.user_is_member || joinGroup.isPending}
                            size="sm"
                          >
                            {group.user_is_member ? 'Joined' : 'Join Group'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No study groups available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Learning Challenges
              </CardTitle>
              <CardDescription>
                Participate in challenges to earn XP and compete with peers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingChallenges ? (
                <div className="text-center py-8">Loading challenges...</div>
              ) : challenges && challenges.length > 0 ? (
                <div className="grid gap-4">
                  {challenges.map((challenge) => (
                    <Card key={challenge.id} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{challenge.title}</h3>
                              <Badge className={getDifficultyColor(challenge.difficulty_level)}>
                                {challenge.difficulty_level}
                              </Badge>
                              <Badge className={getStatusColor(challenge.status)}>
                                {challenge.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{challenge.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(challenge.start_date).toLocaleDateString()} - 
                                {new Date(challenge.end_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4" />
                                {challenge.xp_reward} XP
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {challenge.participant_count} participants
                              </div>
                            </div>
                            {challenge.skill_focus && challenge.skill_focus.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {challenge.skill_focus.map((skill, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => joinChallenge.mutate(challenge.id)}
                            disabled={challenge.user_is_participant || joinChallenge.isPending || challenge.status !== 'active'}
                            size="sm"
                          >
                            {challenge.user_is_participant ? 'Joined' : 'Join Challenge'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active challenges available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Social Learning Leaderboard
              </CardTitle>
              <CardDescription>
                See how you rank among your peers in social learning activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Your Stats</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Collaboration Score:</span>
                          <span className="font-medium">{Math.round(socialMetrics?.collaboration_score || 0)}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Streak:</span>
                          <span className="font-medium">{currentStreak} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Longest Streak:</span>
                          <span className="font-medium">{longestStreak} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Social XP Earned:</span>
                          <span className="font-medium">{socialMetrics?.social_xp_earned || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Peer Recognition</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Average Rating:</span>
                          <span className="font-medium">{socialMetrics?.average_peer_rating.toFixed(1) || '0.0'}/5.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Feedback Received:</span>
                          <span className="font-medium">{socialMetrics?.peer_feedback_received || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Feedback Given:</span>
                          <span className="font-medium">{socialMetrics?.peer_feedback_given || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Global leaderboards coming soon!</p>
                  <p className="text-sm">Keep participating in study groups and challenges to climb the ranks.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}