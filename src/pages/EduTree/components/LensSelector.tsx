import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, DollarSign, TrendingUp } from 'lucide-react';
import { PlanningLens } from '@/lib/types/eduTree';

interface LensSelectorProps {
  selectedLens: PlanningLens;
  onLensChange: (lens: PlanningLens) => void;
  // Multipath props (optional)
  multiPathEnabled?: boolean;
  comparisonLens?: PlanningLens | null;
  onComparisonLensChange?: (lens: PlanningLens | null) => void;
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

export function LensSelector({ 
  selectedLens, 
  onLensChange, 
  multiPathEnabled = false,
  comparisonLens,
  onComparisonLensChange 
}: LensSelectorProps) {
  if (multiPathEnabled) {
    return (
      <div className="flex items-center gap-4">
        {/* Primary Path */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Primary:</span>
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
        </div>

        {/* Comparison Path */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Compare:</span>
          <Select
            value={comparisonLens || 'none'}
            onValueChange={(value) => {
              const newLens = value === 'none' ? null : (value as PlanningLens);
              onComparisonLensChange?.(newLens);

              // URL sync without page reload
              try {
                const url = new URL(window.location.href);
                if (newLens) url.searchParams.set('compare', newLens);
                else url.searchParams.delete('compare');
                window.history.replaceState({}, '', url.toString());
              } catch {}
            }}
          >
            <SelectTrigger 
              className="w-28 h-8 bg-background border border-border"
              aria-label="Select comparison planning lens"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg z-[9999]">
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="fastest">Fastest</SelectItem>
              <SelectItem value="cheapest">Cheapest</SelectItem>
              <SelectItem value="roi">Best ROI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Path Legend - only show when comparison is active */}
        {comparisonLens && (
          <div className="flex items-center gap-3 ml-4 text-xs" role="group" aria-label="Path legend">
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-primary" aria-hidden="true"></div>
              <span className="text-muted-foreground">Primary (solid)</span>
            </div>
            <div className="flex items-center gap-1">
              <div 
                className="w-4 h-0.5 border-b-2 border-dashed opacity-80" 
                style={{ borderColor: 'oklch(var(--amber-500))' }}
                aria-hidden="true"
              ></div>
              <span className="text-muted-foreground">Comparison (dashed)</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Single path mode (existing UI)
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