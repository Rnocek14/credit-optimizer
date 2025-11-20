import { useState } from 'react';
import { TesuBsbaMarketplace } from '@/features/degreeMarketplace/TesuBsbaMarketplace';
import { TesuBsbaComparisonDashboard } from '@/features/degreeMarketplace/TesuBsbaComparisonDashboard';
import { CoscBsbaMarketplace } from '@/features/degreeMarketplace/CoscBsbaMarketplace';
import { CoscBsbaComparisonDashboard } from '@/features/degreeMarketplace/CoscBsbaComparisonDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DegreeMarketplace() {
  const [activeInstitution, setActiveInstitution] = useState<'TESU' | 'COSC'>('TESU');

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Degree Template Marketplace</h1>
        <p className="text-muted-foreground">
          Explore pre-optimized degree paths with real-time cost and credit analysis.
        </p>
      </div>

      <Tabs value={activeInstitution} onValueChange={(v) => setActiveInstitution(v as 'TESU' | 'COSC')}>
        <TabsList className="mb-6">
          <TabsTrigger value="TESU">TESU</TabsTrigger>
          <TabsTrigger value="COSC">COSC</TabsTrigger>
        </TabsList>

        <TabsContent value="TESU" className="space-y-6">
          <TesuBsbaComparisonDashboard />
          <TesuBsbaMarketplace />
        </TabsContent>

        <TabsContent value="COSC" className="space-y-6">
          <CoscBsbaComparisonDashboard />
          <CoscBsbaMarketplace />
        </TabsContent>
      </Tabs>
    </div>
  );
}
