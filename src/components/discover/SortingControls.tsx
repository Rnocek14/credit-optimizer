import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, DollarSign, Target, Clock, SortAsc } from 'lucide-react';

export type SortOption = 'opportunity' | 'salary' | 'growth' | 'demand' | 'time';

interface SortingControlsProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  showTimeSort?: boolean;
  className?: string;
}

export const SortingControls: React.FC<SortingControlsProps> = ({
  currentSort,
  onSortChange,
  showTimeSort = false,
  className = ''
}) => {
  const sortOptions: Array<{
    value: SortOption;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }> = [
    {
      value: 'opportunity' as const,
      label: 'Opportunity Score',
      icon: TrendingUp,
      description: 'Best overall opportunities'
    },
    {
      value: 'salary' as const,
      label: 'Salary',
      icon: DollarSign,
      description: 'Highest paying roles'
    },
    {
      value: 'growth' as const,
      label: 'Growth Rate',
      icon: TrendingUp,
      description: 'Fastest growing careers'
    },
    {
      value: 'demand' as const,
      label: 'Demand',
      icon: Target,
      description: 'Most in-demand skills'
    }
  ];

    if (showTimeSort) {
    sortOptions.push({
      value: 'time' as const,
      label: 'Time to Role',
      icon: Clock,
      description: 'Quickest path to employment'
    });
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <SortAsc className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Sort by:</span>
      </div>
      
      <div className="flex gap-2">
        {/* Desktop: Button group */}
        <div className="hidden md:flex gap-1">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={currentSort === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSortChange(option.value)}
                className="gap-2"
                title={option.description}
              >
                <Icon className="h-3 w-3" />
                {option.label}
              </Button>
            );
          })}
        </div>

        {/* Mobile: Select dropdown */}
        <div className="md:hidden">
          <Select value={currentSort} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-3 w-3" />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};