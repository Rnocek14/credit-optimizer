import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DegreeTemplate, DegreeOptimizationMode } from '@/pages/EduTree/v5/engine/degreeTemplateGenerator';
import type { DegreeTemplatesByMode } from '@/hooks/useCareerDegreeOptions';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DegreeTemplateModalProps {
  templates: DegreeTemplatesByMode;
  defaultMode?: DegreeOptimizationMode;
  planSource?: 'real' | 'mock';
  careerId?: string;
  onClose: () => void;
}

export function DegreeTemplateModal({
  templates,
  defaultMode = 'balanced',
  planSource = 'mock',
  careerId,
  onClose,
}: DegreeTemplateModalProps) {
  const navigate = useNavigate();
  const availableModes = (['balanced', 'cheapest', 'fastest'] as DegreeOptimizationMode[])
    .filter((mode) => !!templates[mode]);

  const [activeMode, setActiveMode] = useState<DegreeOptimizationMode>(
    templates[defaultMode] ? defaultMode : (availableModes[0] ?? 'balanced')
  );

  const activeTemplate = templates[activeMode];
  
  if (!activeTemplate) {
    return null;
  }

  const getModeLabel = (mode: DegreeOptimizationMode) => {
    switch (mode) {
      case 'cheapest': return '💰 Cheapest';
      case 'fastest': return '⚡ Fastest';
      case 'balanced': return '⚖️ Balanced';
      default: return mode;
    }
  };

  const handleApplyToPlanner = () => {
    if (!activeTemplate) return;

    // 1) Persist the active template for EduTree to read
    try {
      const payload = {
        template: activeTemplate,
        appliedAt: new Date().toISOString(),
      };
      localStorage.setItem('eduTree:seedTemplate', JSON.stringify(payload));
      console.log('[DegreeTemplateModal] Template persisted for hydration:', activeTemplate.id);
    } catch (e) {
      console.warn('[DegreeTemplateModal] Failed to persist template:', e);
    }

    // 2) Navigate with query params
    const params = new URLSearchParams({
      programId: activeTemplate.programId,
      anchorSchool: activeTemplate.anchorSchool,
      mode: activeMode,
    });

    if (careerId) params.set('careerId', careerId);
    if (planSource) params.set('planSource', planSource);

    navigate(`/edu-tree-v5?${params.toString()}`);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              {activeTemplate.programId.toUpperCase()} @{' '}
              {activeTemplate.anchorSchool.toUpperCase()}
              {import.meta.env.DEV && (
                <Badge 
                  variant={planSource === 'real' ? 'default' : 'outline'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {planSource === 'real' ? '✓ Real' : 'Mock'}
                </Badge>
              )}
            </span>
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            {activeTemplate.yearTemplates.length || 4}-year plan •{' '}
            {activeTemplate.totals.credits} credits •{' '}
            {activeTemplate.totals.costUsd
              ? `$${activeTemplate.totals.costUsd.toLocaleString()} total cost`
              : 'Cost estimate unavailable'}
            {activeTemplate.totals.avgCri && ` • CRI ${activeTemplate.totals.avgCri.toFixed(0)}`}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {availableModes.length > 1 ? (
            <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as DegreeOptimizationMode)} className="space-y-4">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableModes.length}, 1fr)` }}>
                {availableModes.map(mode => (
                  <TabsTrigger key={mode} value={mode}>
                    {getModeLabel(mode)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {availableModes.map(mode => (
                <TabsContent key={mode} value={mode}>
                  <TemplateView template={templates[mode]!} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <TemplateView template={activeTemplate} />
          )}
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleApplyToPlanner}>
            Apply to Planner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateView({ template }: { template: DegreeTemplate }) {
  if (!template.yearTemplates || template.yearTemplates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No detailed year plan available yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {template.yearTemplates.map((yt, idx) => {
        const est = (yt as any).est ?? (yt as any).estimate ?? {};
        return (
          <div
            key={(yt as any).id ?? idx}
            className="border rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2">
                Year {idx + 1}
                {yt.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {yt.badge}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {est.credits ?? '—'} credits •{' '}
                {est.costUsd
                  ? `$${est.costUsd.toLocaleString()}`
                  : '—'}{' '}
                •{' '}
                {est.weeks
                  ? `${Math.round(est.weeks)} weeks`
                  : '—'}
              </div>
            </div>
            {Array.isArray((yt as any).modules) && (yt as any).modules.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                {(yt as any).modules.map((m: any) => (
                  <li key={m.id}>
                    {m.code ? `${m.code} – ` : ''}
                    {m.title ?? m.name ?? 'Untitled module'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
