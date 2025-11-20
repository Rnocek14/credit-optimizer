import { TesuBsbaMarketplace } from '@/features/degreeMarketplace/TesuBsbaMarketplace';

export default function DegreeMarketplace() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Degree Template Marketplace</h1>
        <p className="text-muted-foreground">
          Explore pre-optimized degree paths with real-time cost and credit analysis.
        </p>
      </div>

      <TesuBsbaMarketplace />
    </div>
  );
}
