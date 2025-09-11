import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, DollarSign, TrendingUp } from 'lucide-react';
import { PlanningLens } from '@/lib/types/eduTree';

interface LensSelectorProps {
  selectedLens: PlanningLens;
  onLensChange: (lens: PlanningLens) => void;
}

const lensConfig = {
  fastest: {
    icon: Zap,
    label: 'Fastest',
    description: 'Earliest completion date',
    color: 'bg-orange-500',
  },
  cheapest: {
    icon: DollarSign,
    label: 'Cheapest',
    description: 'Minimize total cost',
    color: 'bg-green-500',
  },
  roi: {
    icon: TrendingUp,
    label: 'Best ROI',
    description: 'Optimize value per dollar',
    color: 'bg-blue-500',
  },
};

export function LensSelector({ selectedLens, onLensChange }: LensSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">
        Planning Lens:
      </span>
      <div className="flex gap-1">
        {Object.entries(lensConfig).map(([key, config]) => {
          const isSelected = selectedLens === key;
          const Icon = config.icon;
          
          return (
            <Button
              key={key}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onLensChange(key as PlanningLens)}
              className="h-8 px-3"
            >
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Button>
          );
        })}
      </div>
      <Badge variant="outline" className="text-xs">
        {lensConfig[selectedLens].description}
      </Badge>
    </div>
  );
}