import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
                2025 Pricing
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on current provider pricing (Sophia $99/mo, CLEP $95/exam, Study.com $199/mo, TESU ~$400/credit).
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
              <div className="font-medium text-foreground mb-1">Pricing Assumptions (Jan 2025)</div>
              <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                <li><strong>Sophia Learning:</strong> $99/month (unlimited courses)</li>
                <li><strong>CLEP:</strong> $95 per exam + proctoring ($25-$50)</li>
                <li><strong>Study.com:</strong> $199/month (2 exams) or $239/month (5 exams)</li>
                <li><strong>TESU Courses:</strong> ~$400/credit (NJ residents; out-of-state higher)</li>
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
