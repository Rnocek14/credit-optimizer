import { useParams, Link } from 'react-router-dom';
import { useCareerDegreeOptions, type DegreeTemplatesByMode } from '@/hooks/useCareerDegreeOptions';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DegreeTemplateModal } from '@/components/careers/DegreeTemplateModal';
import type { DegreeOptimizationMode } from '@/pages/EduTree/v5/engine/degreeTemplateGenerator';

export function CareerDetailPage() {
  const { careerPathId } = useParams<{ careerPathId: string }>();
  const { career, degreeOptions, isLoading, error } =
    useCareerDegreeOptions(careerPathId);

  const [selectedTemplates, setSelectedTemplates] = useState<{
    templates: DegreeTemplatesByMode;
    defaultMode: DegreeOptimizationMode;
    planSource: 'real' | 'mock';
    careerId?: string;
  } | null>(null);

  if (import.meta.env.DEV) {
    console.log('[CareerDetailPage]', { careerPathId, career: career?.title, degreeOptions: degreeOptions?.length, isLoading, error });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
        <div className="h-24 w-full bg-muted animate-pulse rounded-xl" />
        <div className="h-40 w-full bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-destructive font-semibold">
          Something went wrong loading this career.
        </div>
        <div className="text-sm text-muted-foreground">{error.message}</div>
        <Button variant="outline" asChild>
          <Link to="/explore/careers">Back to careers</Link>
        </Button>
      </div>
    );
  }

  if (!career) {
    return (
      <div className="p-6 space-y-3">
        <div className="font-semibold">Career not found.</div>
        <Button variant="outline" asChild>
          <Link to="/explore/careers">Back to careers</Link>
        </Button>
      </div>
    );
  }

  const hasDegreeOptions = degreeOptions.length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {career.title}
          </h1>
          {career.industry && (
            <p className="text-sm text-muted-foreground mt-1">
              {career.industry}
            </p>
          )}
          {career.summary && (
            <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
              {career.summary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" asChild>
            <Link to={`/edu-tree-v5/marketplace?careerPathId=${careerPathId}`}>
              See degree plans for this career
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/explore/careers">Back to all careers</Link>
          </Button>
        </div>
      </div>

      {/* Salary snapshot */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold">
            Market Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Average Salary
            </div>
            <div className="text-lg font-semibold">
              {career.average_salary
                ? `$${career.average_salary.toLocaleString()}`
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Baseline Salary
            </div>
            <div className="text-lg font-semibold">
              {career.baseline_salary
                ? `$${career.baseline_salary.toLocaleString()}`
                : '—'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Degree options */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recommended Degree Paths</h2>
          {!hasDegreeOptions && (
            <Badge variant="outline">Mapping coming soon</Badge>
          )}
        </div>

        {hasDegreeOptions ? (
          <div className="grid gap-4 md:grid-cols-2">
            {degreeOptions.map(({ templates, primaryTemplate, roi, programId, anchorSchool, planSource }) => (
              <Card
                key={`${programId}_${anchorSchool}`}
                className="flex flex-col justify-between"
              >
                <CardHeader className="space-y-2 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="font-semibold">
                      {programId.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @ {anchorSchool.toUpperCase()}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      Balanced
                    </Badge>
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {primaryTemplate.yearTemplates.length || 4} year plan •{' '}
                    {primaryTemplate.totals.credits} credits
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">
                        Est. Total Cost
                      </div>
                      <div className="font-medium">
                        {primaryTemplate.totals.costUsd
                          ? `$${primaryTemplate.totals.costUsd.toLocaleString()}`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">
                        Duration
                      </div>
                      <div className="font-medium">
                        {primaryTemplate.totals.weeks
                          ? `${Math.round(
                              primaryTemplate.totals.weeks / 52
                            )} years`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">
                        Payback
                      </div>
                      <div className="font-medium">
                        {roi.paybackYears
                          ? `${roi.paybackYears.toFixed(1)} yrs`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="text-xs text-muted-foreground">
                      {roi.roiMultiple
                        ? `ROI ~${roi.roiMultiple.toFixed(1)}×`
                        : 'ROI estimate unavailable'}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedTemplates({
                        templates,
                        defaultMode: 'balanced',
                        planSource,
                        careerId: career.id
                      })}
                    >
                      View plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No degree mappings have been configured yet for this career.
              Once they're added, you'll see cost/time/ROI comparisons here.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Modal */}
      {selectedTemplates && (
        <DegreeTemplateModal
          templates={selectedTemplates.templates}
          defaultMode={selectedTemplates.defaultMode}
          planSource={selectedTemplates.planSource}
          careerId={selectedTemplates.careerId}
          onClose={() => setSelectedTemplates(null)}
        />
      )}
    </div>
  );
}
