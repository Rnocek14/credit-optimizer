import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { useNavigate } from 'react-router-dom';
import { Check, DollarSign, Clock, TrendingUp, Laptop } from 'lucide-react';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MarketplaceDegreeTemplate[];
}

export function ComparisonModal({ isOpen, onClose, templates }: ComparisonModalProps) {
  const navigate = useNavigate();

  if (templates.length === 0) return null;

  const handleSelect = (templateId: string) => {
    navigate(`/edu-tree-v5?templateId=${templateId}`);
    onClose();
  };

  // Calculate comparison metrics
  const cheapest = templates.reduce((min, t) => t.totals.costUsd < min.totals.costUsd ? t : min);
  const fastest = templates.reduce((min, t) => t.totals.weeks < min.totals.weeks ? t : min);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Degree Paths</DialogTitle>
          <DialogDescription>
            Side-by-side comparison to help you choose the best path
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${templates.length}, 1fr)` }}>
          {templates.map(template => {
            const isCheapest = template.id === cheapest.id;
            const isFastest = template.id === fastest.id;
            const timeMonths = Math.round(template.totals.weeks / 4.33);
            const roiYears = (template.totals.costUsd / 60000).toFixed(1);

            return (
              <div key={template.id} className="border rounded-lg p-4 space-y-4">
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm leading-tight">
                      {template.marketplace.title}
                    </h4>
                    {template.marketplace.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {template.marketplace.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.anchorSchool}
                  </p>
                </div>

                {/* Cost */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    <span>Total Cost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      ${(template.totals.costUsd / 1000).toFixed(1)}K
                    </span>
                    {isCheapest && (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Cheapest
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Duration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{timeMonths}mo</span>
                    {isFastest && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Fastest
                      </Badge>
                    )}
                  </div>
                </div>

                {/* ROI */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>ROI</span>
                  </div>
                  <span className="text-sm">Break even in ~{roiYears} years</span>
                </div>

                {/* Lifestyle */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Weekly Commitment</span>
                  </div>
                  <div className="text-sm">
                    {template.lifestyle.avgWeeklyHours} hrs/week
                    <div className="text-xs text-muted-foreground capitalize">
                      {template.lifestyle.paceType}
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Laptop className="h-3 w-3" />
                    <span>Delivery</span>
                  </div>
                  <div className="text-sm">
                    {template.deliveryMode === 'fully_online' && '100% Online'}
                    {template.deliveryMode === 'hybrid' && `Hybrid (${template.inPersonWeeks}w on-campus)`}
                    {template.deliveryMode === 'in_person_required' && 'In-Person Required'}
                  </div>
                </div>

                {/* Provenance */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {template.catalogYear} Catalog
                  <div>Last verified: {new Date(template.lastVerified).toLocaleDateString()}</div>
                </div>

                {/* Select Button */}
                <Button 
                  onClick={() => handleSelect(template.id)}
                  className="w-full"
                  size="sm"
                >
                  Select This Path
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
