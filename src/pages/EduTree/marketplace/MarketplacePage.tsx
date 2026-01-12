import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TemplateFilters } from './components/TemplateFilters';
import { TemplateGrid } from './components/TemplateGrid';
import { ComparisonModal } from './components/ComparisonModal';
import { MultiSchoolSavingsBanner } from './components/MultiSchoolSavingsBanner';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import { AnchorSchoolSelector } from '@/pages/EduTree/v5/components/AnchorSchoolSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, GitCompare, Filter, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MarketplaceFilters } from '@/pages/EduTree/v5/types/templates';

export default function MarketplacePage() {
  const [searchParams] = useSearchParams();
  const careerId = searchParams.get('career');
  const { constraints, setConstraints } = usePlanBasket();

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

  const { data: allTemplates = [], isLoading } = useMarketplaceTemplates(filters);
  
  // Filter templates by selected anchor school
  const templates = constraints.target_school 
    ? allTemplates.filter(t => t.anchorSchool === constraints.target_school)
    : allTemplates;
  
  const filteredCount = allTemplates.length - templates.length;

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
        {/* Planning Disclaimer */}
        <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 flex items-start gap-2">
          <span className="mt-0.5 text-base leading-none">⚠️</span>
          <div className="flex-1">
            <div className="font-medium text-sm text-amber-800 dark:text-amber-200">
              Planning tool only — not official advising
            </div>
            <p className="text-xs leading-snug mt-0.5 text-amber-700 dark:text-amber-300">
              Costs, timelines, and transfer patterns are modeled estimates. Always confirm
              course availability, pricing, and transfer acceptance with the graduation
              school and course providers before enrolling.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 border rounded-lg p-4 bg-card max-h-[calc(100vh-4rem)] overflow-y-auto">
              <TemplateFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </aside>

          {/* Template Grid */}
          <main className="lg:col-span-3">
            {/* Multi-School Savings Banner */}
            {!constraints.target_school && (
              <MultiSchoolSavingsBanner />
            )}
            
            {/* Filter Status Banner */}
            {constraints.target_school && filteredCount > 0 && (
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Showing only <strong>{constraints.target_school}</strong> paths 
                    <span className="text-muted-foreground ml-1">
                      ({filteredCount} other {filteredCount === 1 ? 'template' : 'templates'} hidden)
                    </span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConstraints({ target_school: undefined })}
                  className="h-7 gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear filter
                </Button>
              </div>
            )}
            
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
