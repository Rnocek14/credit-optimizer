/**
 * AnchorSchoolSelector - Database-driven with static fallback
 * 
 * Fetches available institutions from institution_policy_packs table,
 * falls back to static institutionPolicies.ts if DB unavailable.
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2 } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';
import { useAvailableInstitutions, type AvailableInstitution } from '@/lib/degree/useAvailableInstitutions';
import { useInstitutionPolicyPack } from '@/lib/degree/useInstitutionPolicyPack';
import { getPolicyOrDefault, getNoncollegiateCap, getResidencyCredits } from '@/lib/degree/institutionPolicies';

interface PolicyDisplay {
  code: string;
  name: string;
  maxAltCredits: number;
  minResidency: number;
  upperDivMin: number;
  confidence: number;
  status: 'active' | 'draft' | 'static';
}

function useInstitutionPolicyDisplay(institution: AvailableInstitution): PolicyDisplay {
  const { data: packData } = useInstitutionPolicyPack(institution.code);
  
  // If we have a pack with policy, use it; otherwise fall back to static
  if (packData?.policy) {
    return {
      code: institution.code,
      name: institution.name,
      maxAltCredits: packData.policy.max_alt_credits,
      minResidency: packData.policy.min_residency_credits,
      upperDivMin: packData.policy.upper_division_min,
      confidence: packData.confidence ?? institution.confidence,
      status: institution.status,
    };
  }

  // Fall back to static policy
  const staticPolicy = getPolicyOrDefault(institution.code);
  return {
    code: institution.code,
    name: institution.name,
    maxAltCredits: getNoncollegiateCap(institution.code, 'bachelor'),
    minResidency: getResidencyCredits(institution.code, 'standard'),
    upperDivMin: staticPolicy.upperDivisionAreaOfStudyMin,
    confidence: institution.confidence,
    status: institution.status,
  };
}

function InstitutionOption({ institution }: { institution: AvailableInstitution }) {
  const policy = useInstitutionPolicyDisplay(institution);
  
  return (
    <SelectItem value={policy.code}>
      <div className="flex items-center justify-between gap-2 w-full">
        <span className="truncate max-w-[160px]">{policy.name}</span>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">{policy.maxAltCredits} ACE</Badge>
          <Badge variant="outline" className="text-xs">{policy.minResidency} res</Badge>
          {policy.status === 'draft' && (
            <Badge variant="secondary" className="text-xs">Draft</Badge>
          )}
        </div>
      </div>
    </SelectItem>
  );
}

export function AnchorSchoolSelector() {
  const { constraints, setConstraints } = usePlanBasket();
  const { data: institutions, isLoading } = useAvailableInstitutions();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 opacity-70" />
        <div className="w-[320px] h-10 flex items-center justify-center border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <GraduationCap className="h-4 w-4 opacity-70" />
      <Select
        onValueChange={(v) => setConstraints({ target_school: v })}
        value={constraints.target_school}
      >
        <SelectTrigger className="w-[320px]">
          <SelectValue placeholder="Select anchor school" />
        </SelectTrigger>
        <SelectContent>
          {institutions?.map((inst) => (
            <InstitutionOption key={inst.code} institution={inst} />
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
