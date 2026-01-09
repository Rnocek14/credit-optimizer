import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, HelpCircle, GraduationCap, ExternalLink } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';
import { useVerifiedPolicy } from '../hooks/useVerifiedPolicy';
import { PolicyVerificationBadge, getVerificationStatus } from './PolicyVerificationBadge';

/**
 * PolicyCard displays institution transfer policy limits and progress.
 * 
 * TRUST RULES:
 * - Only show authoritative calculations when isVerified=true
 * - When unverified, show disabled meters with "Verification required" messaging
 * - When program-scoped, show "Select a program" prompt for residency
 * - Never display "exceeded" or "need X more" as if certain when unverified
 */
export function PolicyCard() {
  const { items, constraints } = usePlanBasket();
  const anchor = constraints.target_school;

  // Use verified policy service (reads from institution_policy_packs_live + partial findings)
  const { policy, isVerified, isProgramScoped, maxTransferVerified, isLoading } = useVerifiedPolicy();

  if (!anchor || !policy) return null;

  // Get values from policy (verified or estimated)
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

  // Only calculate percentages/states when verified
  const acePct = isVerified ? Math.min(100, (aceCredits / aceCapVerified) * 100 || 0) : 0;
  const aceExceeded = isVerified && aceCredits > aceCapVerified;
  
  const resPct = isVerified ? Math.min(100, (residencyCredits / residencyRequiredVerified) * 100 || 0) : 0;
  const residencyMet = isVerified && residencyCredits >= residencyRequiredVerified;
  
  const udPct = isVerified ? Math.min(100, (upperDivCredits / upperDivRequiredVerified) * 100 || 0) : 0;
  const upperDivMet = isVerified && upperDivCredits >= upperDivRequiredVerified;

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
        {/* Program-scoped banner - takes precedence over unverified */}
        {isProgramScoped && !isVerified && !isLoading && (
          <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
              <GraduationCap className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Residency varies by program</span>
                <p className="text-xs mt-1 opacity-80">
                  {maxTransferVerified 
                    ? `Max transfer verified: ${policy.maxTransferCredits} credits. `
                    : ''}
                  Residency requirement depends on your specific degree program.
                  Select a program to calculate residency.
                </p>
                {policy.maxTransferEvidenceUrl && (
                  <a 
                    href={policy.maxTransferEvidenceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs mt-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View source
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Unverified warning - only show when NOT program-scoped */}
        {!isVerified && !isLoading && !isProgramScoped && (
          <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Policy not verified</span>
                <p className="text-xs mt-1 opacity-80">
                  Transfer limits shown below are estimates. Official verification is pending.
                  Calculations will be enabled once policy is confirmed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ACE/Noncollegiate Credits - COMBINED POOL */}
        <div className={!isVerified ? 'opacity-60' : ''}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Noncollegiate Credits</span>
            <span className={`font-mono ${isVerified && aceExceeded ? 'text-red-600 font-bold' : ''}`}>
              {aceCredits}/{isVerified ? aceCapVerified : `~${aceCapVerified}`}
            </span>
          </div>
          <Progress 
            value={acePct} 
            className={`${isVerified && aceExceeded ? '[&>div]:bg-red-500' : isVerified && acePct >= 80 ? '[&>div]:bg-yellow-500' : !isVerified ? '[&>div]:bg-muted-foreground/30' : ''}`} 
          />
          {isVerified && aceExceeded && (
            <div className="flex items-center gap-2 text-xs text-red-600 mt-1">
              <AlertCircle className="h-3 w-3" /> 
              Exceeds {aceCapVerified}-credit noncollegiate cap by {aceCredits - aceCapVerified}
            </div>
          )}
          {!isVerified && (
            <div className="text-xs text-muted-foreground mt-1 italic">
              Verification required for accurate limit
            </div>
          )}
        </div>

        {/* Residency - HIDE for program-scoped (residency varies by program) */}
        {isProgramScoped ? (
          <div className="opacity-40">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>In-Residence Credits</span>
              <span className="font-mono text-muted-foreground">—</span>
            </div>
            <Progress value={0} className="[&>div]:bg-muted-foreground/20" />
            <div className="text-xs text-muted-foreground mt-1 italic">
              Select a program to see residency requirement
            </div>
          </div>
        ) : (
          <div className={!isVerified ? 'opacity-60' : ''}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>In-Residence Credits</span>
              <span className={`font-mono ${isVerified && residencyMet ? 'text-green-600' : ''}`}>
                {residencyCredits}/{isVerified ? residencyRequiredVerified : `~${residencyRequiredVerified}`}
              </span>
            </div>
            <Progress 
              value={resPct} 
              className={`${isVerified && residencyMet ? '[&>div]:bg-green-500' : isVerified ? '[&>div]:bg-yellow-500' : '[&>div]:bg-muted-foreground/30'}`} 
            />
            {isVerified ? (
              residencyMet ? (
                <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                  <CheckCircle2 className="h-3 w-3" /> Residency requirement met
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-yellow-700 mt-1">
                  <AlertCircle className="h-3 w-3" /> 
                  Need {residencyRequiredVerified - residencyCredits} more in-residence credits
                </div>
              )
            ) : (
              <div className="text-xs text-muted-foreground mt-1 italic">
                Verification required for accurate limit
              </div>
            )}
          </div>
        )}

        {/* Upper Division */}
        <div className={!isVerified ? 'opacity-60' : ''}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Upper Division (300+)</span>
            <span className={`font-mono ${isVerified && upperDivMet ? 'text-green-600' : ''}`}>
              {upperDivCredits}/{isVerified ? upperDivRequiredVerified : `~${upperDivRequiredVerified}`}
            </span>
          </div>
          <Progress 
            value={udPct} 
            className={`${isVerified && upperDivMet ? '[&>div]:bg-green-500' : isVerified ? '[&>div]:bg-yellow-500' : '[&>div]:bg-muted-foreground/30'}`} 
          />
          {isVerified ? (
            upperDivMet ? (
              <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                <CheckCircle2 className="h-3 w-3" /> Upper-division requirement met
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-yellow-700 mt-1">
                <AlertCircle className="h-3 w-3" /> 
                Need {upperDivRequiredVerified - upperDivCredits} more upper-division credits
              </div>
            )
          ) : (
            <div className="text-xs text-muted-foreground mt-1 italic">
              Verification required for accurate limit
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
