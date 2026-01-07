import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';
// NOTE: Policy values come from src/lib/degree/institutionPolicies.ts (single source of truth)
// DB values are used as fallback only - verified values in central service take precedence
import { 
  getPolicyOrDefault, 
  getResidencyCredits, 
  getNoncollegiateCap,
  type InstitutionCode 
} from '@/lib/degree/institutionPolicies';

export function PolicyCard() {
  const { items, constraints } = usePlanBasket();
  const anchor = constraints.target_school;

  // Fetch DB policy for display name (optional)
  const { data: dbPolicy } = useQuery({
    queryKey: ['partner-policy', anchor],
    queryFn: async () => {
      if (!anchor) return null;
      const { data, error } = await supabase
        .from('partner_policies' as any)
        .select('*')
        .eq('partner_code', anchor)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!anchor,
  });

  if (!anchor) return null;

  // Get VERIFIED policy values from central service (single source of truth)
  const verifiedPolicy = getPolicyOrDefault(anchor);
  const aceCapVerified = getNoncollegiateCap(anchor);
  const residencyRequiredVerified = getResidencyCredits(anchor);
  const upperDivRequiredVerified = verifiedPolicy.upperDivisionAreaOfStudyMin;
  
  // Display name from DB or central service
  const displayName = dbPolicy?.partner_name || verifiedPolicy.name;

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

  // Calculate percentages using VERIFIED values
  const acePct = Math.min(100, (aceCredits / aceCapVerified) * 100 || 0);
  const aceExceeded = aceCredits > aceCapVerified;
  
  const resPct = Math.min(100, (residencyCredits / residencyRequiredVerified) * 100 || 0);
  const residencyMet = residencyCredits >= residencyRequiredVerified;
  
  const udPct = Math.min(100, (upperDivCredits / upperDivRequiredVerified) * 100 || 0);
  const upperDivMet = upperDivCredits >= upperDivRequiredVerified;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Policy: {displayName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
