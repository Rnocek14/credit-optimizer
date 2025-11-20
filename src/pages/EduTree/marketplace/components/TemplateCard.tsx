import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, DollarSign, Laptop, MapPin, TrendingUp, Star, AlertCircle, GraduationCap, CheckCircle2 } from 'lucide-react';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { useNavigate } from 'react-router-dom';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProviderBadge, type ProviderCode, PROVIDER_CONFIG } from './ProviderBadge';
import { TransferStatusBadge } from './TransferStatusBadge';
import { useTransferVerification } from '../hooks/useTransferVerification';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: MarketplaceDegreeTemplate;
  isSelected: boolean;
  onToggleSelect: (templateId: string) => void;
}

export function TemplateCard({ template, isSelected, onToggleSelect }: TemplateCardProps) {
  const navigate = useNavigate();
  const { constraints } = usePlanBasket();
  
  const isMatchingAnchor = constraints.target_school === template.anchorSchool;

  const handleSelect = () => {
    navigate(`/edu-tree-v5?templateId=${template.id}`);
  };

  const timeMonths = Math.round(template.totals.weeks / 4.33);
  const roiYears = (template.totals.costUsd / 60000).toFixed(1); // Assume $60K salary gain

  const deliveryBadgeConfig = {
    fully_online: { label: '100% Online', variant: 'default' as const },
    hybrid: { label: `Hybrid (${template.inPersonWeeks}w on-campus)`, variant: 'secondary' as const },
    in_person_required: { label: 'In-Person Required', variant: 'outline' as const },
  };

  const deliveryBadge = deliveryBadgeConfig[template.deliveryMode];

  // Calculate provider mix from yearTemplates
  const providerMix = useMemo(() => {
    const providers = new Map<string, { credits: number; count: number }>();
    
    template.yearTemplates?.forEach(year => {
      year.moduleTemplates?.forEach(module => {
        const option = module.options?.find(o => o.courseId === module.recommendedCourseId) || module.options?.[0];
        if (option?.providerCode) {
          const existing = providers.get(option.providerCode) || { credits: 0, count: 0 };
          providers.set(option.providerCode, {
            credits: existing.credits + (option.credits || 0),
            count: existing.count + 1,
          });
        }
      });
    });

    return Array.from(providers.entries())
      .map(([code, data]) => ({ code: code as ProviderCode, ...data }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 4); // Show top 4 providers
  }, [template.yearTemplates]);

  const totalProviderCredits = useMemo(() => 
    providerMix.reduce((sum, p) => sum + p.credits, 0),
    [providerMix]
  );

  // Collect all courses for transfer verification
  const allCourses = useMemo(() => {
    const courses: Array<{ code: string; providerCode: string | null }> = [];
    template.yearTemplates.forEach(year => {
      year.moduleTemplates.forEach(module => {
        module.options.forEach(option => {
          courses.push({
            code: option.courseId,
            providerCode: option.providerCode || null,
          });
        });
      });
    });
    return courses;
  }, [template.yearTemplates]);

  // Batch verify transfers
  const { data: transferVerifications } = useTransferVerification(
    allCourses,
    template.anchorSchool
  );

  const transferStatusMap = useMemo(() => {
    const map = new Map<string, typeof transferVerifications[0]>();
    transferVerifications?.forEach(v => {
      map.set(`${v.providerCode}:${v.courseCode}`, v);
    });
    return map;
  }, [transferVerifications]);

  return (
    <Card className="relative hover:shadow-lg transition-shadow">
      {/* Badge */}
      {template.marketplace.badge && (
        <div className="absolute -top-3 -right-3 z-10">
          <Badge className="shadow-md" variant={
            template.marketplace.badge === 'Cheapest' ? 'default' :
            template.marketplace.badge === 'Fastest' ? 'secondary' :
            template.marketplace.badge === 'Most Popular' ? 'default' : 'outline'
          }>
            {template.marketplace.badge}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight mb-1">
              {template.marketplace.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {template.marketplace.tagline}
            </CardDescription>
          </div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(template.id)}
            aria-label="Select for comparison"
          />
        </div>

        {/* Anchor School Badge */}
        <div className="mt-3 flex items-center gap-2">
          <Badge variant={isMatchingAnchor ? "default" : "outline"} className="gap-1">
            <GraduationCap className="h-3 w-3" />
            {template.anchorSchool}
          </Badge>
          {isMatchingAnchor && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Matches your graduation school</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span className="text-xs text-muted-foreground">• {template.catalogYear} Catalog</span>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">
                ${(template.totals.costUsd / 1000).toFixed(1)}K
              </div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{timeMonths}</div>
              <div className="text-xs text-muted-foreground">Months</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ROI */}
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">ROI: Break even in ~{roiYears} years</span>
        </div>

        {/* Lifestyle Fit */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {template.lifestyle.avgWeeklyHours} hrs/week • {template.lifestyle.paceType}
          </span>
        </div>

        {/* Delivery Mode */}
        <div className="flex items-center gap-2">
          {template.deliveryMode === 'fully_online' ? (
            <Laptop className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
          <Badge variant={deliveryBadge.variant}>{deliveryBadge.label}</Badge>
        </div>

        {/* Social Proof */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{template.socialProof.popularityScore.toFixed(1)}/5.0</span>
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">⚠️ Modeled estimate (not actual student data)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Provider Mix */}
        {providerMix.length > 0 && (
          <div className="rounded-md bg-muted/60 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Multi-Provider Path
              </span>
              <span className="text-[11px] text-muted-foreground">
                {totalProviderCredits} credits
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {providerMix.map(({ code, credits }) => {
                const config = PROVIDER_CONFIG[code];
                const pct = totalProviderCredits > 0
                  ? Math.round((credits / totalProviderCredits) * 100)
                  : 0;

                // Get sample transfer status for this provider
                const sampleVerification = transferVerifications?.find(
                  v => v.providerCode === code
                );

                return (
                  <TooltipProvider key={code}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center gap-1.5">
                          <div className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1",
                            config?.className
                          )}>
                            {config?.icon && <config.icon className="h-3 w-3" />}
                            <span className="text-[11px] font-medium">
                              {config?.label ?? code}
                            </span>
                            <span className="text-[10px] opacity-80">
                              {credits}cr · {pct}%
                            </span>
                          </div>
                          {sampleVerification && (
                            <TransferStatusBadge
                              status={sampleVerification.status}
                              sourceProvider={code}
                              targetSchool={template.anchorSchool}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{credits} credits ({pct}%) via {config?.label ?? code}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSelect} className="flex-1">
            Select Path
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
