import { HubNavigation } from "@/components/HubNavigation";
import { MayaChatInterface } from "@/components/maya/MayaChatInterface";
import { MayaInsightsCard } from "@/components/dashboard/MayaInsightsCard";
import { MayaIntelligenceCore } from "@/components/MayaIntelligenceCore";
import { SocialMayaIntegration } from "@/components/SocialMayaIntegration";
import { Helmet } from "react-helmet-async";
import { useGamification } from "@/hooks/useGamification";
import { getCurrentUser } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useMayaContextTracking } from "@/hooks/useMayaContextTracking";
import React from "react";

export default function MayaPage() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  });
  
  const { getCurrentStreak } = useGamification(user?.id);
  const { trackPageVisit } = useMayaContextTracking();

  // Track page visit
  React.useEffect(() => {
    trackPageVisit('/maya', { 
      interaction_type: 'maya_chat_access',
      user_intent: 'direct_maya_interaction'
    });
  }, [trackPageVisit]);

  return (
    <>
      <Helmet>
        <title>Maya AI Assistant – Career Intelligence | PathfindAI</title>
        <meta name="description" content="Chat with Maya, your AI career intelligence assistant. Get personalized insights, market analysis, and career guidance powered by real-time data." />
        <link rel="canonical" href={`${window.location.origin}/maya`} />
      </Helmet>
      <HubNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Maya AI Assistant</h1>
          <p className="text-muted-foreground">
            Your personal career intelligence assistant powered by real-time market data and advanced AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-2">
            <MayaChatInterface 
              onInsightGenerated={(insight) => {
                console.log('New Maya insight generated:', insight);
              }}
            />
          </div>

          {/* Side Panel with Insights and Intelligence */}
          <div className="space-y-6">
            {/* Current Insights */}
            <MayaInsightsCard 
              userName={user?.name || user?.email?.split('@')[0] || 'there'}
              currentStreak={getCurrentStreak ? getCurrentStreak() : 0}
            />

            {/* Intelligence Core Metrics */}
            <MayaIntelligenceCore />

            {/* Social Intelligence */}
            <SocialMayaIntegration userId={user?.id || '2b458624-d498-4cca-a63d-9341cc20e363'} />
          </div>
        </div>
      </div>
    </>
  );
}