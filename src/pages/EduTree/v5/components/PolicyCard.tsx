import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';
import { useVerifiedPolicy } from '../hooks/useVerifiedPolicy';
import { PolicyVerificationBadge, getVerificationStatus } from './PolicyVerificationBadge';

export function PolicyCard() {
  const { items, constraints } = usePlanBasket();
  const anchor = constraints.target_school;

  // Use verified policy service (reads from institution_policy_packs_live)
  const { policy, isVerified, isLoading } = useVerifiedPolicy();

  if (!anchor || !policy) return null;

  // Get values from verified policy (uses live pack or falls back to central service)
  const aceCapVerified = policy.maxNoncollegiateCredits;
  const residencyRequiredVerified = policy.residencyCredits;
  const upperDivRequiredVerified = policy.upperDivisionMin;
  const displayName = policy.institutionName;

  // Calculate credits from basket
  const aceCredits = items
    .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
    .reduce((s, i) => s + (i.credits || 0), 0);

  const residencyCredits = items
    .filter(i => i.providerType === 'university')
    .reduce((s, i) => s + (i.credits || 0), 0);

  const upperDivCredits = items
    .filter(i => (i.level || 0) >= 300)
    .reduce((s, i) => s + (i.credits || 0), 0);

  // Calculate percentages using verified values
  const acePct = Math.min(100, (aceCredits / aceCapVerified) * 100 || 0);
  const aceExceeded = aceCredits > aceCapVerified;
  
  const resPct = Math.min(100, (residencyCredits / residencyRequiredVerified) * 100 || 0);
  const residencyMet = residencyCredits >= residencyRequiredVerified;
  
  const udPct = Math.min(100, (upperDivCredits / upperDivRequiredVerified) * 100 || 0);
  const upperDivMet = upperDivCredits >= upperDivRequiredVerified;

  const verificationStatus = getVerificationStatus(isVerified, isLoading, policy.confidence);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Policy: {displayName}</CardTitle>
          <PolicyVerificationBadge 
            status={verificationStatus}
            confidence={policy.confidence}
            source={policy.source}
            evidenceUrl={policy.evidenceUrl}
            verifiedAt={policy.verifiedAt}
            compact
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unverified warning */}
        {!isVerified && !isLoading && (
          <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2 text-xs text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Policy values are estimated. Official verification pending.
                {policy.notes && ` ${policy.notes}`}
              </span>
            </div>
          </div>
        )}

        {/* ACE/Noncollegiate Credits - COMBINED POOL */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Noncollegiate Credits</span>
            <span className={`font-mono ${aceExceeded ? 'text-red-600 font-bold' : ''}`}>
              {aceCredits}/{aceCapVerified}
            </span>
          </div>
          <Progress 
            value={acePct} 
            className={`${aceExceeded ? '[&>div]:bg-red-500' : acePct >= 80 ? '[&>div]:bg-yellow-500' : ''}`} 
          />
          {aceExceeded && (
            <div className="flex items-center gap-2 text-xs text-red-600 mt-1">
              <AlertCircle className="h-3 w-3" /> 
              Exceeds {aceCapVerified}-credit noncollegiate cap by {aceCredits - aceCapVerified}
            </div>
          )}
        </div>

        {/* Residency */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>In-Residence Credits</span>
            <span className={`font-mono ${residencyMet ? 'text-green-600' : ''}`}>
              {residencyCredits}/{residencyRequiredVerified}
            </span>
          </div>
          <Progress 
            value={resPct} 
            className={`${residencyMet ? '[&>div]:bg-green-500' : '[&>div]:bg-yellow-500'}`} 
          />
          {residencyMet ? (
            <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
              <CheckCircle2 className="h-3 w-3" /> Residency requirement met
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-yellow-700 mt-1">
              <AlertCircle className="h-3 w-3" /> 
              Need {residencyRequiredVerified - residencyCredits} more in-residence credits
            </div>
          )}
        </div>

        {/* Upper Division */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Upper Division (300+)</span>
            <span className={`font-mono ${upperDivMet ? 'text-green-600' : ''}`}>
              {upperDivCredits}/{upperDivRequiredVerified}
            </span>
          </div>
          <Progress 
            value={udPct} 
            className={`${upperDivMet ? '[&>div]:bg-green-500' : '[&>div]:bg-yellow-500'}`} 
          />
          {upperDivMet ? (
            <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
              <CheckCircle2 className="h-3 w-3" /> Upper-division requirement met
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-yellow-700 mt-1">
              <AlertCircle className="h-3 w-3" /> 
              Need {upperDivRequiredVerified - upperDivCredits} more upper-division credits
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
