import { useState } from 'react';
import { useMultiSchoolSavings, formatSavings, formatWeeksAsMonths } from '@/hooks/useMultiSchoolSavings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingDown, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MultiSchoolSavingsBannerProps {
  onCompareClick?: () => void;
}

export function MultiSchoolSavingsBanner({ onCompareClick }: MultiSchoolSavingsBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { savingsData, isLoading } = useMultiSchoolSavings();
  const navigate = useNavigate();

  if (dismissed || isLoading || !savingsData) return null;
  
  // Only show if there's meaningful savings (at least $500)
  if (savingsData.maxSavings < 500) return null;

  // Find the most expensive comparison for contrast
  const mostExpensive = savingsData.comparisons.find(c => !c.isCheapest);
  
  const handleCompareClick = () => {
    if (onCompareClick) {
      onCompareClick();
    } else {
      navigate('/degree-marketplace');
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4 mb-6">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-primary/10 rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Cost Savings */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-full">
            <TrendingDown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {savingsData.cheapestSchool} is cheapest
              </span>
              <Badge variant="secondary" className="text-xs">
                Save {formatSavings(savingsData.maxSavings)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatSavings(savingsData.cheapestCost)} vs {mostExpensive ? `${formatSavings(mostExpensive.cost)} at ${mostExpensive.school}` : 'other schools'}
            </p>
          </div>
        </div>

        {/* Time Savings - show if different school is fastest */}
        {savingsData.cheapestSchool !== savingsData.fastestSchool && savingsData.maxTimeSaved > 4 && (
          <div className="flex items-center gap-3 pl-0 sm:pl-4 sm:border-l border-border">
            <div className="p-2 bg-secondary/50 rounded-full">
              <Clock className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {savingsData.fastestSchool} is fastest
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatWeeksAsMonths(savingsData.fastestWeeks)} completion
              </p>
            </div>
          </div>
        )}

        {/* Compare CTA */}
        <div className="ml-auto">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCompareClick}
            className="gap-2"
          >
            Compare Schools
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
