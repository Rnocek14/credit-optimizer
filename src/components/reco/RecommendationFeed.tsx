import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Info, LayoutList, LayoutGrid } from 'lucide-react';
import { UnifiedRecommendation, RecommendationDensity, RecoType } from '@/types/recommendations';
import { RecommendationCard } from './RecommendationCard';
import { RecommendationEmptyState } from './RecommendationEmptyState';
import { RecommendationSkeleton } from './RecommendationSkeleton';
import { QuickActions } from './QuickActions';
import { useUnifiedRecommendations } from '@/hooks/useUnifiedRecommendations';

interface RecommendationFeedProps {
  userId?: string;
  className?: string;
}

export function RecommendationFeed({ userId, className }: RecommendationFeedProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [density, setDensity] = useState<RecommendationDensity>('cozy');
  const { data: recommendations = [], isLoading } = useUnifiedRecommendations(userId);

  // Load density preference from localStorage
  useEffect(() => {
    const savedDensity = localStorage.getItem('reco-density') as RecommendationDensity;
    if (savedDensity) {
      setDensity(savedDensity);
    }
  }, []);

  // Save density preference to localStorage
  const handleDensityChange = (newDensity: RecommendationDensity) => {
    setDensity(newDensity);
    localStorage.setItem('reco-density', newDensity);
  };

  // Load active tab from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('reco-active-tab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save active tab to localStorage
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('reco-active-tab', tab);
  };

  // Filter recommendations based on active tab
  const filteredRecommendations = recommendations.filter(rec => {
    if (activeTab === 'all') return true;
    
    // Map tab names to recommendation types
    const tabToTypeMap: Record<string, string> = {
      'skill-gaps': 'skill_gap',
      'maya': 'maya_action', 
      'market': 'market_alert',
      'projects': 'proof_project'
    };
    
    return rec.type === tabToTypeMap[activeTab];
  });

  // Check if user has skill gaps for QuickActions
  const hasSkillGaps = recommendations.some(rec => rec.type === 'skill_gap');

  if (isLoading) {
    return (
      <div className={className} data-testid="reco-feed">
        <RecommendationSkeleton />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={className} data-testid="reco-feed">
        <RecommendationEmptyState />
      </div>
    );
  }

  return (
    <div className={className} data-testid="reco-feed">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Feed */}
        <div className="flex-1">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Recommended for You</CardTitle>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Why?
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle
                    pressed={density === 'compact'}
                    onPressedChange={(pressed) => 
                      handleDensityChange(pressed ? 'compact' : 'cozy')
                    }
                    size="sm"
                    data-testid="reco-density-toggle"
                  >
                    {density === 'compact' ? (
                      <LayoutList className="h-4 w-4" />
                    ) : (
                      <LayoutGrid className="h-4 w-4" />
                    )}
                  </Toggle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all" data-testid="reco-tab-all">All</TabsTrigger>
                  <TabsTrigger value="skill-gaps" data-testid="reco-tab-skill-gaps">Skill Gaps</TabsTrigger>
                  <TabsTrigger value="maya" data-testid="reco-tab-maya">Maya</TabsTrigger>
                  <TabsTrigger value="market" data-testid="reco-tab-market">Market</TabsTrigger>
                  <TabsTrigger value="projects" data-testid="reco-tab-projects">Projects</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                  <div className="space-y-4">
                    {filteredRecommendations.map((recommendation, index) => (
                      <RecommendationCard
                        key={recommendation.id}
                        recommendation={recommendation}
                        density={density}
                        isPrimary={index === 0}
                        criBoost={recommendation.criBoost || 0}
                        criExplanation={recommendation.criExplanation || ''}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Rail - Quick Actions */}
        {hasSkillGaps && (
          <div className="lg:w-80">
            <QuickActions skillGaps={recommendations.filter(rec => rec.type === 'skill_gap')} />
          </div>
        )}
      </div>
    </div>
  );
}