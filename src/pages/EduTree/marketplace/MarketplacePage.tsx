import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TemplateFilters } from './components/TemplateFilters';
import { TemplateGrid } from './components/TemplateGrid';
import { ComparisonModal } from './components/ComparisonModal';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';
import { AnchorSchoolSelector } from '@/pages/EduTree/v5/components/AnchorSchoolSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, GitCompare } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MarketplaceFilters } from '@/pages/EduTree/v5/types/templates';

export default function MarketplacePage() {
  const [searchParams] = useSearchParams();
  const careerId = searchParams.get('career');

  const [filters, setFilters] = useState<MarketplaceFilters>({
    careerIds: careerId ? [careerId] : [],
    budgetRange: [0, 50000],
    timeRange: [12, 60],
    weeklyHoursRange: [5, 40],
    deliveryMode: 'all',
    anchorSchools: [],
    sortBy: 'popularity',
  });

  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { data: templates = [], isLoading } = useMarketplaceTemplates(filters);

  const handleToggleSelect = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId].slice(0, 3) // Max 3 for comparison
    );
  };

  const selectedTemplateData = templates.filter(t => selectedTemplates.includes(t.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/edu-tree-v5">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Planner
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Degree Path Marketplace</h1>
              <p className="text-sm text-muted-foreground">
                Find the perfect degree path for your goals
              </p>
            </div>
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <span className="text-sm font-medium text-muted-foreground">Graduation school:</span>
              <AnchorSchoolSelector />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 border rounded-lg p-4 bg-card">
              <TemplateFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </aside>

          {/* Template Grid */}
          <main className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {templates.length} degree path{templates.length !== 1 ? 's' : ''} found
              </div>
            </div>

            <TemplateGrid
              templates={templates}
              isLoading={isLoading}
              selectedTemplates={selectedTemplates}
              onToggleSelect={handleToggleSelect}
            />
          </main>
        </div>
      </div>

      {/* Sticky Comparison Footer */}
      {selectedTemplates.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95 p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {selectedTemplates.length} selected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Select up to 3 to compare
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedTemplates([])}
              >
                Clear Selection
              </Button>
              <Button
                onClick={() => setShowComparison(true)}
                disabled={selectedTemplates.length < 2}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Compare ({selectedTemplates.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        templates={selectedTemplateData}
      />
    </div>
  );
}
