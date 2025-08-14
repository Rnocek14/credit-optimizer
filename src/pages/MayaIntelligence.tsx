import React from 'react';
import { HubNavigation } from '@/components/HubNavigation';
import { MayaIntelligenceCore } from '@/components/MayaIntelligenceCore';
import { GamificationInformedIntelligence } from '@/components/GamificationInformedIntelligence';
import { MayaPredictiveTransparency } from '@/components/MayaPredictiveTransparency';
import { MayaDecisionTransparency } from '@/components/MayaDecisionTransparency';

export default function MayaIntelligence() {
  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Maya Intelligence Enhancement
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Phase 3.4: Advanced AI transparency, gamification-informed recommendations, 
              and predictive career guidance powered by your learning patterns.
            </p>
          </div>

          {/* Core Intelligence Dashboard */}
          <MayaIntelligenceCore />

          {/* Sample Decision Transparency */}
          <MayaDecisionTransparency 
            decision="Recommended Advanced Python Machine Learning Course"
            context="Based on your 7-day learning streak and Data Science career goal"
            confidence={89}
            showDetails={true}
          />

          {/* Gamification-Informed Intelligence */}
          <GamificationInformedIntelligence />

          {/* Predictive Transparency */}
          <MayaPredictiveTransparency />
        </div>
      </main>
    </div>
  );
}