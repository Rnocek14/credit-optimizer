import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INSTITUTION_RATES, PROVIDER_RATES } from '@/lib/pricing/referenceRates';

interface TESUDisclaimerBannerProps {
  onDismiss?: () => void;
}

export function TESUDisclaimerBanner({ onDismiss }: TESUDisclaimerBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border-2 border-warning/30 bg-warning/5 overflow-hidden">
      {/* Main Banner */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground flex items-center gap-2">
              Cost & Time Estimates
              <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-background/50 rounded">
                Pricing as of {INSTITUTION_RATES.TESU.effectiveDate}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on provider pricing as of {PROVIDER_RATES.SOPHIA.asOf} (Sophia $
              {PROVIDER_RATES.SOPHIA.monthlyUsd}/mo, CLEP ~${PROVIDER_RATES.CLEP.perExamUsd}/exam,
              Study.com ${PROVIDER_RATES.STUDYCOM.monthlyUsd}/mo) and TESU tuition effective{' '}
              {INSTITUTION_RATES.TESU.effectiveDate} (${INSTITUTION_RATES.TESU.perCreditInStateUsd}/credit
              in state, ${INSTITUTION_RATES.TESU.perCreditUsd} out of state).
              <strong className="text-foreground"> Does NOT include</strong> TESU enrollment fees (~$3,192), books, proctoring fees, or potential price changes.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-warning/20 bg-warning/[0.02] px-4 py-3">
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium text-foreground mb-1">Pricing Assumptions</div>
              <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                <li>
                  <strong>Sophia Learning:</strong> ${PROVIDER_RATES.SOPHIA.monthlyUsd}/month
                  (unlimited courses)
                </li>
                <li>
                  <strong>CLEP:</strong> ~${PROVIDER_RATES.CLEP.perExamUsd} per exam + proctoring ($25-$50)
                </li>
                <li>
                  <strong>Study.com:</strong> ${PROVIDER_RATES.STUDYCOM.monthlyUsd}/month (College Plus)
                </li>
                <li>
                  {/* Was "~$400/credit (NJ residents)", which matched neither
                      the in-state nor the out-of-state published rate. */}
                  <strong>TESU Courses:</strong> ${INSTITUTION_RATES.TESU.perCreditInStateUsd}/credit
                  (NJ residents), ${INSTITUTION_RATES.TESU.perCreditUsd}/credit out of state — effective{' '}
                  {INSTITUTION_RATES.TESU.effectiveDate}, so verify current rates before enrolling
                </li>
              </ul>
            </div>
            
            <div>
              <div className="font-medium text-foreground mb-1">Not Included in Estimates</div>
              <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                <li><strong>TESU Enrollment Fees:</strong> ~$3,192 (application, graduation, technology fees)</li>
                <li><strong>Books & Materials:</strong> Varies by course ($0-$200 per course)</li>
                <li><strong>Proctoring:</strong> $25-$50 per exam (remote) or varies (in-person)</li>
                <li><strong>Subscription Overlap:</strong> If you take courses slower than assumed</li>
              </ul>
            </div>

            <div>
              <div className="font-medium text-foreground mb-1">Duration Assumptions</div>
              <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                <li><strong>Sophia:</strong> 2-4 weeks per course (self-paced, varies by difficulty)</li>
                <li><strong>CLEP/DSST:</strong> 2-8 weeks prep time (depends on prior knowledge)</li>
                <li><strong>Study.com:</strong> 4-8 weeks per course (self-paced)</li>
                <li><strong>TESU Courses:</strong> 12-16 weeks (semester-based, fixed schedule)</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-warning/20">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Important:</strong> This optimizer provides estimates based on publicly available transfer guides and pricing as of January 2025.
                Equivalencies have confidence scores indicating reliability. Always verify course acceptance, current pricing, and residency requirements
                with <a href="https://www.tesu.edu/admissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TESU Admissions</a> before enrolling.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
