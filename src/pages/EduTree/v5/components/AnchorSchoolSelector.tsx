/**
 * AnchorSchoolSelector - Uses central policy service as source of truth
 * 
 * CRITICAL: Policy values come from institutionPolicies.ts, NOT from DB
 * DB partner_policies table is for reference only - central service is authoritative
 */
import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';
import { 
  getAvailableInstitutions, 
  getPolicyOrDefault, 
  getResidencyCredits,
  getNoncollegiateCap,
  type InstitutionCode 
} from '@/lib/degree/institutionPolicies';

interface PolicyDisplay {
  code: InstitutionCode;
  name: string;
  maxAltCredits: number;
  minResidency: number;
  upperDivMin: number;
}

export function AnchorSchoolSelector() {
  const { constraints, setConstraints } = usePlanBasket();

  // Get policies from central service (single source of truth)
  const policies = useMemo((): PolicyDisplay[] => {
    return getAvailableInstitutions().map(code => {
      const policy = getPolicyOrDefault(code);
      return {
        code,
        name: policy.name,
        maxAltCredits: getNoncollegiateCap(code, 'bachelor'),
        minResidency: getResidencyCredits(code, 'standard'),
        upperDivMin: policy.upperDivisionAreaOfStudyMin,
      };
    });
  }, []);

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
          {policies.map((p) => (
            <SelectItem key={p.code} value={p.code}>
              <div className="flex items-center justify-between gap-2 w-full">
                <span>{p.name}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline">{p.maxAltCredits} ACE</Badge>
                  <Badge variant="outline">{p.minResidency} res</Badge>
                  <Badge variant="outline">{p.upperDivMin} UD</Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
