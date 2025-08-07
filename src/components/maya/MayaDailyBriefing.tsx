import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, TrendingUp, AlertCircle, Target, Clock, ChevronRight } from 'lucide-react';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

interface MayaDailyBriefingProps {
  userId: string;
  onNavigate?: (tab: string) => void;
}

export function MayaDailyBriefing({ userId, onNavigate }: MayaDailyBriefingProps) {
  const { profile: userProfile } = useUserProfile(userId);
  const { sendEnhancedRequest, loading, lastResponse } = useEnhancedMaya();
  const [briefingData, setBriefingData] = useState<any>(null);

  useEffect(() => {
    const generateDailyBriefing = async () => {
      if (!userProfile) return;
      
      const context = {
        careerPath: userProfile.current_role,
        location: userProfile.location,
        goals: userProfile.career_goals,
        skillLevel: userProfile.experience_level === 'entry' ? 1 : userProfile.experience_level === 'mid' ? 2 : 3
      };

      const response = await sendEnhancedRequest(
        "Generate my daily career briefing with today's key insights, market alerts, and priority actions.",
        context
      );

      if (response) {
        setBriefingData(response);
      }
    };

    generateDailyBriefing();
  }, [userProfile, sendEnhancedRequest]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const insights = lastResponse?.requestAnalysis?.insights || [];
  const marketAlerts = insights.filter((insight: any) => insight.type === 'market_alert').slice(0, 3);
  const opportunityAlerts = insights.filter((insight: any) => insight.type === 'opportunity').slice(0, 2);
  const priorityActions = lastResponse?.autonomousActions?.slice(0, 3) || [];

  return (
    <div className="space-y-4">
      {/* Maya Daily Briefing Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Maya's Daily Briefing</h3>
              <p className="text-sm text-muted-foreground">Your personalized career intelligence for today</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/30">
              <Clock className="w-3 h-3 mr-1" />
              Updated Now
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {lastResponse?.response || "Good morning! Maya is analyzing your career landscape and will provide insights shortly."}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Market Alerts */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Market Alerts
              <Badge variant="outline" className="ml-auto">
                {marketAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {marketAlerts.length > 0 ? (
              <>
                {marketAlerts.map((alert, index) => (
                  <div key={index} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {alert.title || 'Market Opportunity'}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {alert.message || 'New trends identified in your field'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => onNavigate?.('copilot')}
                >
                  View All Alerts
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No urgent market alerts today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opportunity Notifications */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-green-600" />
              Opportunities
              <Badge variant="outline" className="ml-auto">
                {opportunityAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {opportunityAlerts.length > 0 ? (
              <>
                {opportunityAlerts.map((opportunity, index) => (
                  <div key={index} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          {opportunity.title || 'Career Opportunity'}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {opportunity.message || 'New pathway identified for growth'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => onNavigate?.('pivot')}
                >
                  Explore Opportunities
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No new opportunities today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Actions */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-4 h-4 text-purple-600" />
              Priority Actions
              <Badge variant="outline" className="ml-auto">
                {priorityActions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {priorityActions.length > 0 ? (
              <>
                {priorityActions.map((action, index) => (
                  <div key={index} className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Bot className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                          {action.action || 'Recommended Action'}
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                          {action.reasoning || 'Maya suggests taking this action today'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => onNavigate?.('workflows')}
                >
                  Manage Actions
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No urgent actions needed</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}