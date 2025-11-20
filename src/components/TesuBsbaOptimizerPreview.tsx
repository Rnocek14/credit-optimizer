import { useMemo } from 'react';
import { useDegreeTemplates } from '@/hooks/useDegreeTemplates';
import { useInstitutionLimits } from '@/hooks/useInstitutionLimits';
import { useAltCreditEquivalenciesForInstitution } from '@/hooks/useAltCreditEquivalencies';
import { optimizeDegreePlan } from '@/lib/creditOptimizer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, DollarSign, Clock, GraduationCap } from 'lucide-react';

export function TesuBsbaOptimizerPreview() {
  const { data: templateData, isLoading: templatesLoading } = useDegreeTemplates({
    institutionCode: 'TESU',
    programCode: 'BSBA',
    trackType: 'alt_max',
  });

  const { data: limits, isLoading: limitsLoading } = useInstitutionLimits('TESU');
  const { data: equivalencies, isLoading: equivLoading } = useAltCreditEquivalenciesForInstitution('TESU');

  const optimized = useMemo(() => {
    if (!templateData || !templateData.length || !limits || !equivalencies) return null;

    return optimizeDegreePlan({
      institutionCode: 'TESU',
      template: templateData[0],
      mode: 'alt_max',
      preferences: { avoidExams: false, preferSophia: true },
      equivalencies,
      limits,
    });
  }, [templateData, limits, equivalencies]);

  const isLoading = templatesLoading || limitsLoading || equivLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>TESU BSBA Optimizer</CardTitle>
          <CardDescription>Loading optimization data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!optimized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>TESU BSBA Optimizer</CardTitle>
          <CardDescription>No optimization data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { metrics, warnings, hydratedTerms } = optimized;
  const hasWarnings = Object.keys(warnings).length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">TESU BSBA - Alt-Credit Max</CardTitle>
              <CardDescription>Optimized degree plan using alternative credits</CardDescription>
            </div>
            <Badge variant={hasWarnings ? 'destructive' : 'default'}>
              {optimized.mode}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-2xl font-bold">${metrics.estTotalCostUsd.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-4">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold">{metrics.totalCredits}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Alt Credits</p>
                <p className="text-2xl font-bold">{metrics.totalAltCredits}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((metrics.totalAltCredits / metrics.totalCredits) * 100)}% of total
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Credit Breakdown */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Credit Distribution</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Alternative Credits</p>
                <p className="text-2xl font-bold text-primary">{metrics.totalAltCredits}</p>
                <p className="text-xs text-muted-foreground">
                  Cap: {metrics.altCreditCap ?? 'N/A'}
                </p>
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">TESU Institutional</p>
                <p className="text-2xl font-bold text-primary">{metrics.totalInstitutionalCredits}</p>
                <p className="text-xs text-muted-foreground">
                  Min Residency: {metrics.minResidencyRequired ?? 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {hasWarnings && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Policy Warnings</h3>
                {warnings.exceedsAltCreditCap && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Plan exceeds alternative credit cap ({metrics.altCreditCap} credits)
                    </AlertDescription>
                  </Alert>
                )}
                {warnings.belowResidencyMin && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Plan does not meet minimum residency requirement ({metrics.minResidencyRequired} credits)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}

          {!hasWarnings && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                This plan meets all TESU credit transfer and residency requirements
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Terms Preview */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Term Overview</h3>
            <div className="space-y-3">
              {hydratedTerms.map((term) => (
                <div key={term.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold">{term.label}</h4>
                    <Badge variant="outline">{term.termCredits} credits</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {term.slots.map((slot) => (
                      <div key={slot.slotId} className="flex items-center justify-between">
                        <span>{slot.courseCode ?? slot.identifier}</span>
                        <span className="text-xs">
                          {slot.sourceType === 'alt_credit' ? slot.sourceCode : 'TESU'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
