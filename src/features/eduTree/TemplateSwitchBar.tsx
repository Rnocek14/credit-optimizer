import * as React from 'react';
import { optimizeDegreePlan } from '@/lib/creditOptimizer';
import { transformOptimizedPlanToPlanBasket } from '@/lib/eduTree/transformOptimizedPlan';
import { useDegreeTemplates } from '@/hooks/useDegreeTemplates';
import { useInstitutionLimits } from '@/hooks/useInstitutionLimits';
import { useAltCreditEquivalenciesForInstitution } from '@/hooks/useAltCreditEquivalencies';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import type { InstitutionCode, TrackType } from '@/types/degreeTemplates';
import type { OptimizerMode } from '@/types/optimizer';
import { Loader2 } from 'lucide-react';

interface TemplateSwitchBarProps {
  institutionCode: InstitutionCode;
  programCode: string;
  currentTrackType: TrackType;
  currentMode: OptimizerMode;
}

export const TemplateSwitchBar: React.FC<TemplateSwitchBarProps> = ({
  institutionCode,
  programCode,
  currentTrackType,
  currentMode,
}) => {
  const loadFromBasket = usePlanBasket(s => s.loadFromBasket);

  const { data: templates, isLoading: templatesLoading } = useDegreeTemplates({
    institutionCode,
    programCode,
  });
  const { data: limits, isLoading: limitsLoading } = useInstitutionLimits(institutionCode);
  const { data: equivalencies, isLoading: equivLoading } =
    useAltCreditEquivalenciesForInstitution(institutionCode);

  const isBusy = templatesLoading || limitsLoading || equivLoading;

  const [pendingTrack, setPendingTrack] = React.useState<TrackType | null>(null);

  const hasStandard = templates?.some((t) => t.track_type === 'standard') ?? false;
  const hasAltMax = templates?.some((t) => t.track_type === 'alt_max') ?? false;

  async function handleSwitch(targetTrack: TrackType) {
    if (!templates || !limits || !equivalencies) return;
    if (targetTrack === currentTrackType) return;

    setPendingTrack(targetTrack);

    try {
      const template = templates.find((t) => t.track_type === targetTrack);
      if (!template) return;

      const mode: OptimizerMode =
        targetTrack === 'alt_max' ? 'alt_max' : 'standard_like';

      const optimized = optimizeDegreePlan({
        institutionCode,
        template,
        mode,
        preferences: {
          avoidExams: false,
          preferSophia: true,
        },
        equivalencies,
        limits,
      });

      const basket = transformOptimizedPlanToPlanBasket(optimized);
      loadFromBasket(basket);
    } finally {
      setPendingTrack(null);
    }
  }

  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-xs md:text-sm">
      <div className="flex flex-col">
        <span className="font-medium">
          {institutionCode} {programCode}
        </span>
        <span className="text-[11px] text-muted-foreground md:text-xs">
          Switch between standard and alt-credit-optimized templates.
        </span>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
        {hasStandard && (
          <button
            type="button"
            onClick={() => handleSwitch('standard')}
            disabled={isBusy || currentTrackType === 'standard' || pendingTrack === 'standard'}
            className={[
              'rounded-full px-3 py-1 text-xs md:text-sm transition flex items-center gap-1.5',
              currentTrackType === 'standard'
                ? 'bg-background font-medium shadow'
                : 'text-muted-foreground hover:bg-background/70',
            ].join(' ')}
          >
            {pendingTrack === 'standard' && <Loader2 className="h-3 w-3 animate-spin" />}
            Standard
          </button>
        )}

        {hasAltMax && (
          <button
            type="button"
            onClick={() => handleSwitch('alt_max')}
            disabled={isBusy || currentTrackType === 'alt_max' || pendingTrack === 'alt_max'}
            className={[
              'rounded-full px-3 py-1 text-xs md:text-sm transition flex items-center gap-1.5',
              currentTrackType === 'alt_max'
                ? 'bg-background font-medium shadow'
                : 'text-muted-foreground hover:bg-background/70',
            ].join(' ')}
          >
            {pendingTrack === 'alt_max' && <Loader2 className="h-3 w-3 animate-spin" />}
            Alt-Credit Max
          </button>
        )}
      </div>
    </div>
  );
};
