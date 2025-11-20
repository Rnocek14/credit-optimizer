import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, DollarSign, Laptop, MapPin, TrendingUp, Star, AlertCircle } from 'lucide-react';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TemplateCardProps {
  template: MarketplaceDegreeTemplate;
  isSelected: boolean;
  onToggleSelect: (templateId: string) => void;
}

export function TemplateCard({ template, isSelected, onToggleSelect }: TemplateCardProps) {
  const navigate = useNavigate();

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

        {/* School */}
        <div className="text-sm text-muted-foreground">
          <strong>{template.anchorSchool}</strong> • {template.catalogYear} Catalog
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
