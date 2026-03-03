import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TemplateFilters } from './components/TemplateFilters';
import { TemplateGrid } from './components/TemplateGrid';
import { ComparisonModal } from './components/ComparisonModal';
import { MultiSchoolSavingsBanner } from './components/MultiSchoolSavingsBanner';
import { DataStatusStrip } from './components/DataStatusStrip';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import { AnchorSchoolSelector } from '@/pages/EduTree/v5/components/AnchorSchoolSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, GitCompare, Filter, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { fetchDegreeTemplatesForCareer } from '@/shared/lib/api/careerTemplates';
import type { MarketplaceFilters } from '@/pages/EduTree/v5/types/templates';

// Debug flag: only log in dev or with ?debug=1
const isDebug = () =>
  import.meta.env.DEV || new URLSearchParams(window.location.search).get('debug') === '1';

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const careerPathId = searchParams.get('careerPathId');
  const { constraints, setConstraints } = usePlanBasket();

  // Career→template bridge: fetch matching program/institution pairs
  const { data: careerBridge } = useQuery({
    queryKey: ['career-template-bridge', careerPathId],
    queryFn: () => fetchDegreeTemplatesForCareer(careerPathId!),
    enabled: !!careerPathId,
    staleTime: 5 * 60_000,
  });

  // Fetch career name for banner display
  const { data: careerName } = useQuery({
    queryKey: ['career-name', careerPathId],
    queryFn: async () => {
      const { fetchCareerPathName } = await import('@/shared/lib/api/careerTemplates');
      return fetchCareerPathName(careerPathId!);
    },
    enabled: !!careerPathId,
    staleTime: 10 * 60_000,
  });

  const [filters, setFilters] = useState<MarketplaceFilters>({
    careerIds: careerPathId ? [careerPathId] : [],
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
  
  // Apply career filter: if bridge returned matching pairs, filter templates to those
  const careerFilteredTemplates = (() => {
    if (!careerPathId || !careerBridge?.programCodes?.length) return allTemplates;
    const pairSet = new Set(
      (careerBridge.matches ?? []).map(m => `${m.anchor_school}::${m.program_id}`)
    );
    const filtered = allTemplates.filter(t =>
      pairSet.has(`${t.anchorSchool}::${t.programId}`)
    );
    // If no templates match the career filter, show all with a fallback message
    return filtered.length > 0 ? filtered : allTemplates;
  })();

  // Compute banner state from bridge data, not filtered list length
  const hasMappings = (careerBridge?.matches?.length ?? 0) > 0;
  const hasMatchingTemplates = (() => {
    if (!careerPathId || !hasMappings) return false;
    const pairSet = new Set(
      (careerBridge?.matches ?? []).map(m => `${m.anchor_school}::${m.program_id}`)
    );
    return allTemplates.some(t => pairSet.has(`${t.anchorSchool}::${t.programId}`));
  })();

  // Sort by career strength when filtered
  const strengthSorted = (() => {
    if (!hasMatchingTemplates || !careerBridge?.strengthMap) return careerFilteredTemplates;
    return [...careerFilteredTemplates].sort((a, b) => {
      const sa = careerBridge.strengthMap!.get(`${a.anchorSchool}::${a.programId}`) ?? 0;
      const sb = careerBridge.strengthMap!.get(`${b.anchorSchool}::${b.programId}`) ?? 0;
      return sb - sa;
    });
  })();

  // Filter by anchor school
  const templates = constraints.target_school 
    ? strengthSorted.filter(t => t.anchorSchool === constraints.target_school)
    : strengthSorted;
  
  const filteredCount = allTemplates.length - templates.length;

  // Clear stale selections when filtered templates no longer include them
  useEffect(() => {
    const visibleIds = new Set(templates.map(t => t.id));
    const validSelections = selectedTemplates.filter(id => visibleIds.has(id));
    
    if (validSelections.length !== selectedTemplates.length) {
      setSelectedTemplates(validSelections);
      if (validSelections.length < 2 && showComparison) {
        setShowComparison(false);
        toast.info('Comparison cleared: some selected templates are no longer visible');
      }
    }
  }, [templates, selectedTemplates, showComparison]);

  // Debug logging for compare state
  useEffect(() => {
    if (isDebug()) {
      console.log('[MarketplaceCompare] State:', {
        selectedTemplates,
        selectedTemplateData: templates.filter(t => selectedTemplates.includes(t.id)).map(t => ({ 
          id: t.id, 
          school: t.anchorSchool 
        })),
        showComparison,
        totalTemplates: templates.length,
      });
    }
  }, [selectedTemplates, showComparison, templates]);

  const handleToggleSelect = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId].slice(0, 3) // Max 3 for comparison
    );
  };

  // Handler for banner compare button
  const handleBannerCompareClick = () => {
    if (selectedTemplates.length >= 2) {
      // Already have selections, open modal
      setShowComparison(true);
    } else if (templates.length >= 2) {
      // Auto-select top 2 templates and open modal
      setSelectedTemplates([templates[0].id, templates[1].id]);
      setShowComparison(true);
      toast.success('Auto-selected top 2 paths for comparison');
    } else {
      toast.info('Need at least 2 degree paths to compare');
    }
  };

  const selectedTemplateData = templates.filter(t => selectedTemplates.includes(t.id));

  return (
    <div className="flex-1 bg-background">
      {/* Inline page title — global nav provided by AppShell */}
      <div className="container mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Degree Path Marketplace</h1>
            <p className="text-sm text-muted-foreground">Find the perfect degree path for your goals</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Graduation school:</span>
            <AnchorSchoolSelector />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Dev-only data status strip */}
        <DataStatusStrip />
        
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
            <div className="sticky top-4 border rounded-lg p-4 bg-card max-h-[calc(100vh-8rem)] overflow-y-auto">
              <TemplateFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </aside>

          {/* Template Grid */}
          <main className="lg:col-span-3">
            {/* Career Filter Banner */}
            {careerPathId && (
              <div className="mb-4 rounded-lg border border-accent bg-accent/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                   {hasMappings && hasMatchingTemplates ? (
                      <>Showing degree plans aligned to {careerName ? <strong>{careerName}</strong> : 'this career'} <Badge variant="secondary">Best fit first</Badge></>
                    ) : hasMappings && !hasMatchingTemplates ? (
                      <>Mappings found for {careerName ? <strong>{careerName}</strong> : 'this career'}, but no templates match current filters — showing all</>
                    ) : (
                      <>No direct career mappings found — showing all templates</>
                    )}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('careerPathId');
                    setSearchParams(next);
                  }}
                  className="h-7 gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              </div>
            )}

            {/* Multi-School Savings Banner */}
            {!constraints.target_school && !careerPathId && (
              <MultiSchoolSavingsBanner onCompareClick={handleBannerCompareClick} />
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
