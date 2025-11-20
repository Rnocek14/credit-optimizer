import { useState } from 'react';
import { TesuBsbaMarketplace } from '@/features/degreeMarketplace/TesuBsbaMarketplace';
import { TesuBsbaComparisonDashboard } from '@/features/degreeMarketplace/TesuBsbaComparisonDashboard';
import { CoscBsbaMarketplace } from '@/features/degreeMarketplace/CoscBsbaMarketplace';
import { CoscBsbaComparisonDashboard } from '@/features/degreeMarketplace/CoscBsbaComparisonDashboard';
import { InstitutionComparisonView } from '@/features/degreeMarketplace/InstitutionComparisonView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DegreeMarketplace() {
  const [activeTab, setActiveTab] = useState<'tesu' | 'cosc' | 'compare'>('compare');

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Degree Template Marketplace</h1>
        <p className="text-muted-foreground">
          Explore pre-optimized degree paths with real-time cost and credit analysis.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tesu' | 'cosc' | 'compare')}>
        <TabsList className="mb-6">
          <TabsTrigger value="compare">Compare Institutions</TabsTrigger>
          <TabsTrigger value="tesu">TESU</TabsTrigger>
          <TabsTrigger value="cosc">COSC</TabsTrigger>
        </TabsList>

        <TabsContent value="compare" className="space-y-6">
          <InstitutionComparisonView />
        </TabsContent>

        <TabsContent value="tesu" className="space-y-6">
          <TesuBsbaComparisonDashboard />
          <TesuBsbaMarketplace />
        </TabsContent>

        <TabsContent value="cosc" className="space-y-6">
          <CoscBsbaComparisonDashboard />
          <CoscBsbaMarketplace />
        </TabsContent>
      </Tabs>
    </div>
  );
}
