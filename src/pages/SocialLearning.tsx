import React from 'react';
import Navigation from '@/components/Navigation';
import { SocialLearningDashboard } from '@/components/SocialLearningDashboard';
import { SocialMayaIntegration } from '@/components/SocialMayaIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Bot } from 'lucide-react';

export default function SocialLearning() {
  // For demo purposes, using Aisha Khan's ID
  const userId = '2b458624-d498-4cca-a63d-9341cc20e363';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Social Learning Hub
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Phase 3.5: Connect with peers, join study groups, participate in challenges, 
              and leverage AI-powered social learning recommendations.
            </p>
          </div>

          <Tabs defaultValue="social" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="social" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Social Learning
              </TabsTrigger>
              <TabsTrigger value="maya" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Maya Social Intelligence
              </TabsTrigger>
            </TabsList>

            <TabsContent value="social">
              <SocialLearningDashboard userId={userId} />
            </TabsContent>

            <TabsContent value="maya">
              <SocialMayaIntegration userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}