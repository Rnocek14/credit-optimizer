/**
 * Policy-Aware Badges Component
 * Displays informational badges and warnings based on policy constraints.
 * 
 * Guardrail #3: Warnings are ALWAYS informational, never disabling/blocking.
 */

import { Badge } from "@/components/ui/badge";
import type { ProviderType } from '../utils/optionScoring';

export interface PolicyBadgesProps {
  option: {
    credits: number;
    providerType?: ProviderType;
    providerCode?: string;
    aceNccrs?: boolean;
    proctored?: boolean;
  };
  anchorPolicy: {
    partner_name?: string;
    max_alt_credits?: number;
    min_residency_credits?: number;
  } | null;
  currentAceCredits: number;
}

export function PolicyBadges({ 
  option, 
  anchorPolicy, 
  currentAceCredits 
}: PolicyBadgesProps) {
  // Early return if no option
  if (!option) return null;
  
  const badges: React.ReactNode[] = [];
  
  // Alt credit detection: MOOCs and bootcamps count toward alt credit cap
  // Note: testing_center (exams like CLEP, DSST) also count as alt credits at most schools
  const isAltCredit = option.providerType === 'mooc' || 
                      option.providerType === 'bootcamp' ||
                      option.providerType === 'testing_center';
  
  // Check if this is from the anchor institution (residency)
  // Normalize both codes to uppercase for comparison
  const normalizedProviderCode = option.providerCode?.toUpperCase().trim();
  const normalizedPartnerCode = anchorPolicy?.partner_name?.toUpperCase().trim();
  const isResidency = normalizedPartnerCode && normalizedProviderCode && 
    normalizedProviderCode === normalizedPartnerCode;
  
  // ===== Positive Badges =====
  
  // ACE/NCCRS badge - high transfer confidence
  if (option.aceNccrs) {
    badges.push(
      <Badge 
        key="ace" 
        variant="outline" 
        className="text-[10px] bg-green-50 border-green-300 text-green-700"
      >
        ACE ✓
      </Badge>
    );
  }
  
  // Proctored badge - higher rigor
  if (option.proctored) {
    badges.push(
      <Badge 
        key="proctored" 
        variant="outline" 
        className="text-[10px] bg-blue-50 border-blue-200 text-blue-700"
      >
        🔒 Proctored
      </Badge>
    );
  }
  
  // Residency badge - counts toward institutional requirement
  if (isResidency) {
    badges.push(
      <Badge 
        key="residency" 
        variant="default" 
        className="text-[10px] bg-primary text-primary-foreground"
      >
        ✨ Residency
      </Badge>
    );
  }
  
  // Alt credit badge - informational, not negative
  if (isAltCredit && !isResidency) {
    badges.push(
      <Badge 
        key="alt" 
        variant="secondary" 
        className="text-[10px]"
      >
        Alt Credit
      </Badge>
    );
  }
  
  // ===== Warning Badges (informational only, never blocking) =====
  
  // Would exceed alt credit cap - show warning if close or over
  if (isAltCredit && anchorPolicy?.max_alt_credits) {
    const wouldTotal = currentAceCredits + option.credits;
    const exceedsBy = wouldTotal - anchorPolicy.max_alt_credits;
    
    if (exceedsBy > 0) {
      badges.push(
        <Badge 
          key="alt-warning" 
          variant="outline" 
          className="text-[10px] bg-yellow-50 border-yellow-300 text-yellow-700"
        >
          ⚠️ May exceed {anchorPolicy.max_alt_credits}cr alt cap
        </Badge>
      );
    }
  }
  
  if (badges.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {badges}
    </div>
  );
}

/**
 * Recommended Reason Component
 * Shows a 1-line explanation for why an option is recommended.
 */
export interface RecommendedReasonProps {
  reason: string;
  isTopOption: boolean;
  sortBy: string;
}

export function RecommendedBadge({ 
  reason, 
  isTopOption, 
  sortBy 
}: RecommendedReasonProps) {
  if (!isTopOption || sortBy !== 'best-match') return null;
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="default" 
        className="text-[10px] bg-primary text-primary-foreground"
      >
        ⭐ Recommended
      </Badge>
      <span className="text-[10px] text-muted-foreground italic">
        {reason}
      </span>
    </div>
  );
}
