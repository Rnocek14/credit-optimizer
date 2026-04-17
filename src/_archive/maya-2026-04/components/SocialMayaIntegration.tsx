import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, MessageSquare, Lightbulb } from 'lucide-react';
import { useSocialLearning } from '@/hooks/useSocialLearning';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';

interface SocialMayaIntegrationProps {
  userId: string;
}

export function SocialMayaIntegration({ userId }: SocialMayaIntegrationProps) {
  const { socialMetrics } = useSocialLearning(userId);
  const { getResponseInsights } = useEnhancedMaya();

  const insights = getResponseInsights();

  const getSocialInfluenceLevel = () => {
    const score = socialMetrics?.collaboration_score || 0;
    if (score >= 80) return { level: 'High', color: 'bg-green-500/10 text-green-600' };
    if (score >= 50) return { level: 'Medium', color: 'bg-yellow-500/10 text-yellow-600' };
    return { level: 'Low', color: 'bg-red-500/10 text-red-600' };
  };

  const socialInfluence = getSocialInfluenceLevel();

  const socialRecommendations = [
    {
      type: "Study Group",
      title: "Join React Developers Group",
      reason: "Based on your current learning path and peer success patterns",
      confidence: 0.85,
      social_data: {
        avg_completion_rate: 78,
        peer_ratings: 4.3,
        active_members: 12
      }
    },
    {
      type: "Learning Challenge",
      title: "30-Day JavaScript Mastery",
      reason: "Peers with similar backgrounds show 90% completion rate",
      confidence: 0.92,
      social_data: {
        peer_success_rate: 90,
        avg_xp_gained: 450,
        collaboration_boost: 15
      }
    },
    {
      type: "Peer Feedback",
      title: "Request Code Review",
      reason: "Your recent projects would benefit from senior developer feedback",
      confidence: 0.77,
      social_data: {
        available_mentors: 3,
        avg_response_time: "2 hours",
        improvement_score: 25
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Social Learning Intelligence Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Maya Social Intelligence
          </CardTitle>
          <CardDescription>
            AI-powered recommendations based on peer learning patterns and social collaboration data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Social Influence</span>
                <Badge className={socialInfluence.color}>
                  {socialInfluence.level}
                </Badge>
              </div>
              <div className="text-2xl font-bold">{Math.round(socialMetrics?.collaboration_score || 0)}/100</div>
              <p className="text-xs text-muted-foreground">
                Based on group participation and peer feedback
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Peer Learning Impact</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">+{socialMetrics?.social_xp_earned || 0}</div>
              <p className="text-xs text-muted-foreground">
                XP gained through social learning activities
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Maya Social Score</span>
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">
                {insights?.autonomousActionsCount ? Math.round(insights.autonomousActionsCount * 10) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                AI confidence in social recommendations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social-Informed Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Social Learning Recommendations
          </CardTitle>
          <CardDescription>
            Personalized suggestions based on peer success patterns and collaborative learning data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {socialRecommendations.map((rec, index) => (
              <Card key={index} className="border border-border/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{rec.type}</Badge>
                        <span className="text-sm font-medium text-primary">
                          {Math.round(rec.confidence * 100)}% confidence
                        </span>
                      </div>
                      <h4 className="font-semibold">{rec.title}</h4>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{rec.reason}</p>
                  
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    {rec.type === "Study Group" && (
                      <>
                        <div>
                          <span className="font-medium">Completion Rate</span>
                          <div className="text-primary">{rec.social_data.avg_completion_rate}%</div>
                        </div>
                        <div>
                          <span className="font-medium">Peer Rating</span>
                          <div className="text-primary">{rec.social_data.peer_ratings}/5.0</div>
                        </div>
                        <div>
                          <span className="font-medium">Active Members</span>
                          <div className="text-primary">{rec.social_data.active_members}</div>
                        </div>
                      </>
                    )}
                    
                    {rec.type === "Learning Challenge" && (
                      <>
                        <div>
                          <span className="font-medium">Peer Success</span>
                          <div className="text-primary">{rec.social_data.peer_success_rate}%</div>
                        </div>
                        <div>
                          <span className="font-medium">Avg XP Gained</span>
                          <div className="text-primary">{rec.social_data.avg_xp_gained}</div>
                        </div>
                        <div>
                          <span className="font-medium">Collaboration Boost</span>
                          <div className="text-primary">+{rec.social_data.collaboration_boost}%</div>
                        </div>
                      </>
                    )}
                    
                    {rec.type === "Peer Feedback" && (
                      <>
                        <div>
                          <span className="font-medium">Available Mentors</span>
                          <div className="text-primary">{rec.social_data.available_mentors}</div>
                        </div>
                        <div>
                          <span className="font-medium">Response Time</span>
                          <div className="text-primary">{rec.social_data.avg_response_time}</div>
                        </div>
                        <div>
                          <span className="font-medium">Improvement Score</span>
                          <div className="text-primary">+{rec.social_data.improvement_score}%</div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Maya Decision Factors with Social Context */}
      <Card>
        <CardHeader>
          <CardTitle>Social Learning Decision Factors</CardTitle>
          <CardDescription>
            How Maya uses social learning data to enhance recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Peer Success Patterns</span>
              <span className="text-sm text-primary">High influence on course recommendations</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Collaboration History</span>
              <span className="text-sm text-primary">Affects study group matching algorithm</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Social Engagement Level</span>
              <span className="text-sm text-primary">Influences challenge difficulty selection</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Peer Feedback Quality</span>
              <span className="text-sm text-primary">Impacts mentorship opportunities</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}