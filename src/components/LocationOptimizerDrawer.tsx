import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocationSwitchOptimizer, LocationAnalysis } from '@/hooks/useLocationSwitchOptimizer';
import { 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ArrowUpDown,
  Check,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationOptimizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fromTrackId?: string;
  toTrackId?: string;
  onLocationSelect?: (locationId: string, location: LocationAnalysis) => void;
}

type SortOption = 'lqi' | 'netIncome' | 'breakEven' | 'demandScore';

export const LocationOptimizerDrawer: React.FC<LocationOptimizerDrawerProps> = ({
  isOpen,
  onClose,
  fromTrackId,
  toTrackId,
  onLocationSelect
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('lqi');
  const { toast } = useToast();

  const { 
    data: optimizationData, 
    isLoading, 
    error 
  } = useLocationSwitchOptimizer({
    fromTrackId,
    toTrackId,
    topN: 10
  });

  const handleLocationSelect = (location: LocationAnalysis) => {
    const locationId = `${location.country}-${location.city}`;
    onLocationSelect?.(locationId, location);
    
    toast({
      title: "Location Selected",
      description: `Selected ${location.city}, ${location.country} for analysis`,
    });
    
    onClose();
  };

  const sortedLocations = optimizationData?.rankedLocations ? [...optimizationData.rankedLocations].sort((a, b) => {
    switch (sortBy) {
      case 'lqi':
        return b.lqi - a.lqi;
      case 'netIncome':
        return b.netIncome - a.netIncome;
      case 'breakEven':
        if (a.breakEvenMonths === null && b.breakEvenMonths === null) return 0;
        if (a.breakEvenMonths === null) return 1;
        if (b.breakEvenMonths === null) return -1;
        return a.breakEvenMonths - b.breakEvenMonths;
      case 'demandScore':
        return b.demandScore - a.demandScore;
      default:
        return 0;
    }
  }) : [];

  const LocationCard: React.FC<{ location: LocationAnalysis; rank: number }> = ({ location, rank }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleLocationSelect(location)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              {rank}
            </div>
            <CardTitle className="text-lg">{location.city}, {location.country}</CardTitle>
            {location.visaRequired && (
              <Badge variant="outline" className="text-xs">
                Visa Required
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">LQI {location.lqi}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              <span>Target Salary</span>
            </div>
            <div className="font-semibold">${Math.round(location.targetSalary / 1000)}k</div>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span>Net Income</span>
            </div>
            <div className="font-semibold">${Math.round(location.netIncome / 1000)}k</div>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              <span>Break-even</span>
            </div>
            <div className="font-semibold">
              {location.breakEvenMonths ? `${location.breakEvenMonths}mo` : 'N/A'}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span>Demand Score</span>
            </div>
            <div className="font-semibold">{Math.round(location.demandScore)}</div>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>COL Index: {location.colIndex.toFixed(1)}</span>
            <span>Delta ROI: {location.deltaROI > 0 ? '+' : ''}${Math.round(location.deltaROI / 1000)}k</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Optimizer
          </SheetTitle>
          <SheetDescription>
            Find the best locations for your career switch based on salary, cost of living, and market demand.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Sort Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-sm font-medium">Sort by:</span>
            </div>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lqi">LQI Score</SelectItem>
                <SelectItem value="netIncome">Net Income</SelectItem>
                <SelectItem value="breakEven">Break-even Time</SelectItem>
                <SelectItem value="demandScore">Market Demand</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800 text-sm">
                  Failed to load location data: {error.message}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Results */}
          {optimizationData && !isLoading && (
            <>
              {/* Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">Switch: </span>
                      <span>{optimizationData.fromTrack} → {optimizationData.toTrack}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {sortedLocations.length} locations analyzed
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Cards */}
              <div className="space-y-4">
                {sortedLocations.map((location, index) => (
                  <LocationCard
                    key={`${location.city}-${location.country}`}
                    location={location}
                    rank={index + 1}
                  />
                ))}
              </div>

              {/* Assumptions */}
              {optimizationData.assumptions && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-sm">Analysis Assumptions</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <div>Base Current Salary: ${Math.round(optimizationData.assumptions.currentBaseSalary / 1000)}k</div>
                    <div>Base Target Salary: ${Math.round(optimizationData.assumptions.targetBaseSalary / 1000)}k</div>
                    <div>Switch Cost: ${Math.round(optimizationData.assumptions.switchCost / 1000)}k</div>
                    <div>Baseline Cost: ${Math.round(optimizationData.assumptions.baselineCost / 1000)}k</div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Empty State */}
          {!isLoading && !error && (!optimizationData || sortedLocations.length === 0) && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No location data available</p>
                  <p className="text-sm">Select both tracks to see location recommendations</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};