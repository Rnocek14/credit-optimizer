import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInstitutionLimits } from '@/hooks/useInstitutionLimits';
import { useGenEdCategories } from '@/hooks/useGenEdCategories';
import { useAltCreditEquivalenciesForInstitution } from '@/hooks/useAltCreditEquivalencies';
import { usePlanBasket } from '../state/usePlanBasket';
import { validateTESUPolicies } from '../engine/constraints';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LimitProgress {
  label: string;
  current: number;
  limit: number;
  limitType: 'max' | 'min';
  percentage: number;
  status: 'ok' | 'warning' | 'error';
}

export function PlanAuditPanel() {
  const { data: limits, isLoading: limitsLoading } = useInstitutionLimits('TESU');
  const { data: genEdCategories, isLoading: genEdLoading } = useGenEdCategories('TESU');
  const { data: equivalencies, isLoading: equivLoading } = useAltCreditEquivalenciesForInstitution('TESU');
  const basket = usePlanBasket(s => s.items);

  const isLoading = limitsLoading || genEdLoading || equivLoading;

  const progress = useMemo<LimitProgress[]>(() => {
    if (!limits) return [];

    // Calculate credits from basket
    const totalCredits = basket.reduce((sum, item) => sum + item.credits, 0);
    const altCredits = basket
      .filter(item => item.providerType === 'mooc' || item.providerType === 'testing_center')
      .reduce((sum, item) => sum + item.credits, 0);
    const residencyCredits = basket
      .filter(item => item.providerCode === 'TESU' || item.providerType === 'university')
      .reduce((sum, item) => sum + item.credits, 0);
    const clepCredits = basket
      .filter(item => item.courseId.includes('CLEP'))
      .reduce((sum, item) => sum + item.credits, 0);
    const dsstCredits = basket
      .filter(item => item.courseId.includes('DSST'))
      .reduce((sum, item) => sum + item.credits, 0);
    // Approximate upper-division (300/400 level courses)
    const upperDivCredits = basket
      .filter(item => {
        const match = item.courseId.match(/[A-Z]+-(\d+)/);
        return match && parseInt(match[1]) >= 300;
      })
      .reduce((sum, item) => sum + item.credits, 0);

    const results: LimitProgress[] = [];

    // Total credits (assuming 120 for bachelor's)
    results.push({
      label: 'Total Credits',
      current: totalCredits,
      limit: 120,
      limitType: 'min',
      percentage: Math.min((totalCredits / 120) * 100, 100),
      status: totalCredits >= 120 ? 'ok' : totalCredits >= 100 ? 'warning' : 'error',
    });

    // Find specific limits from database
    limits.forEach(limitRow => {
      switch (limitRow.limit_type) {
        case 'min_residency':
          results.push({
            label: 'TESU Residency',
            current: residencyCredits,
            limit: limitRow.credit_value,
            limitType: 'min',
            percentage: Math.min((residencyCredits / limitRow.credit_value) * 100, 100),
            status: residencyCredits >= limitRow.credit_value ? 'ok' : residencyCredits >= limitRow.credit_value * 0.8 ? 'warning' : 'error',
          });
          break;
        case 'alt_credit_max':
          results.push({
            label: 'Alternative Credits',
            current: altCredits,
            limit: limitRow.credit_value,
            limitType: 'max',
            percentage: (altCredits / limitRow.credit_value) * 100,
            status: altCredits <= limitRow.credit_value ? 'ok' : altCredits <= limitRow.credit_value * 1.1 ? 'warning' : 'error',
          });
          break;
      }
    });

    // Per-provider caps from database (with fallback defaults)
    const clepLimit = limits.find(l => l.limit_type === 'clep_max')?.credit_value ?? 40;
    const dsstLimit = limits.find(l => l.limit_type === 'dsst_max')?.credit_value ?? 30;
    const upperLimit = limits.find(l => l.limit_type === 'upper_division_min')?.credit_value ?? 30;

    results.push({
      label: 'CLEP Credits',
      current: clepCredits,
      limit: clepLimit,
      limitType: 'max',
      percentage: (clepCredits / clepLimit) * 100,
      status: clepCredits <= clepLimit ? 'ok' : clepCredits <= clepLimit * 1.1 ? 'warning' : 'error',
    });

    results.push({
      label: 'DSST Credits',
      current: dsstCredits,
      limit: dsstLimit,
      limitType: 'max',
      percentage: (dsstCredits / dsstLimit) * 100,
      status: dsstCredits <= dsstLimit ? 'ok' : dsstCredits <= dsstLimit * 1.1 ? 'warning' : 'error',
    });

    results.push({
      label: 'Upper Division',
      current: upperDivCredits,
      limit: upperLimit,
      limitType: 'min',
      percentage: Math.min((upperDivCredits / upperLimit) * 100, 100),
      status: upperDivCredits >= upperLimit ? 'ok' : upperDivCredits >= upperLimit * 0.8 ? 'warning' : 'error',
    });

    return results;
  }, [limits, basket]);

  // Run TESU policy validation
  const violations = useMemo(() => {
    if (!limits || !genEdCategories) return [];
    return validateTESUPolicies(basket, limits, genEdCategories, equivalencies);
  }, [basket, limits, genEdCategories, equivalencies]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-2 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  const hasWarnings = progress.some(p => p.status === 'warning') || violations.some(v => v.severity === 'warning');
  const hasErrors = progress.some(p => p.status === 'error') || violations.some(v => v.severity === 'error');

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Plan Audit</h3>
        <p className="text-sm text-muted-foreground">
          Real-time policy compliance for TESU BSBA
        </p>
      </div>

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some requirements are not met or limits exceeded
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && !hasErrors && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Approaching limits or requirements
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {progress.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                {item.status === 'ok' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {item.status === 'warning' && (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                {item.label}
              </span>
              <span className="text-muted-foreground">
                {item.current}/{item.limit}
                {item.limitType === 'max' ? ' max' : ' min'}
              </span>
            </div>
            <Progress 
              value={item.percentage} 
              className={
                item.status === 'error' ? 'bg-destructive/20' :
                item.status === 'warning' ? 'bg-orange-600/20' :
                'bg-secondary'
              }
            />
          </div>
        ))}
      </div>

      {/* TESU Policy Violations */}
      {violations.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Policy Violations</h4>
            <Badge variant={hasErrors ? 'destructive' : 'secondary'} className="text-xs">
              {violations.filter(v => v.severity === 'error').length} errors, {violations.filter(v => v.severity === 'warning').length} warnings
            </Badge>
          </div>
          
          <div className="space-y-2">
            {violations.map((violation, idx) => (
              <Alert 
                key={idx} 
                variant={violation.severity === 'error' ? 'destructive' : 'default'}
                className="py-3"
              >
                <div className="flex items-start gap-2">
                  {violation.severity === 'error' && <AlertCircle className="h-4 w-4 mt-0.5" />}
                  {violation.severity === 'warning' && <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-600" />}
                  {violation.severity === 'info' && <Info className="h-4 w-4 mt-0.5 text-blue-600" />}
                  <div className="flex-1 min-w-0">
                    <AlertDescription className="text-sm">
                      <span className="font-medium">{violation.message}</span>
                      {violation.suggestedFix && (
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 {violation.suggestedFix}
                        </p>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* All Clear Message */}
      {!hasErrors && !hasWarnings && basket.length > 0 && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            ✓ All TESU requirements met
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
