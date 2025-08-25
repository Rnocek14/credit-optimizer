import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { getUserCareerTracks } from '@/lib/switching';
import { useCareerProfileCard } from '@/hooks/useCareerProfileCard';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowRight, 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Target,
  AlertTriangle,
  GitCompare,
  Loader2
} from 'lucide-react';

export const CompareTracks = () => {
  const [searchParams] = useSearchParams();
  const [trackAId, setTrackAId] = useState<string>(searchParams.get('a') || '');
  const [trackBId, setTrackBId] = useState<string>(searchParams.get('b') || '');
  const [showBacktrack, setShowBacktrack] = useState(false);
  const { toast } = useToast();
  
  // Auto-populate missing track selections when tracks are loaded
  useEffect(() => {
    const urlTrackA = searchParams.get('a');
    const urlTrackB = searchParams.get('b');
    
    if (urlTrackA && !trackAId) setTrackAId(urlTrackA);
    if (urlTrackB && !trackBId) setTrackBId(urlTrackB);
  }, [searchParams, trackAId, trackBId]);

  const { data: tracks, isLoading: tracksLoading, error: tracksError } = useQuery({
    queryKey: ['career-tracks'],
    queryFn: getUserCareerTracks,
    retry: 1,
  });

  const { data: profileA, isLoading: loadingA } = useCareerProfileCard(trackAId);
  const { data: profileB, isLoading: loadingB } = useCareerProfileCard(trackBId);

  // Auto-fallback track selection when tracks are loaded
  useEffect(() => {
    if (!tracksLoading && tracks && tracks.length >= 2) {
      if (!trackAId) setTrackAId(tracks[0].id);
      if (!trackBId && trackAId) {
        const otherTrack = tracks.find(t => t.id !== trackAId);
        if (otherTrack) setTrackBId(otherTrack.id);
      }
    }
  }, [tracks, tracksLoading, trackAId, trackBId]);

  const canCompare = profileA && profileB;
  const isLoadingProfiles = loadingA || loadingB;

  const calculateBacktrackScenario = () => {
    if (!profileA || !profileB) return null;

    // Mock backtrack calculation
    const sunkTimeMonths = 8; // Time already invested in Track B
    const transferCreditReclaimed = 65; // Percentage of skills transferable back
    const newBreakEvenMonths = Math.ceil((profileA.breakEvenMonths || 12) * 0.7); // Reduced due to experience

    return {
      sunkTimeMonths,
      transferCreditReclaimed,
      newBreakEvenMonths,
      netTimeImpact: sunkTimeMonths - (transferCreditReclaimed * 0.1), // Simplified calculation
    };
  };

  const backtrackData = showBacktrack ? calculateBacktrackScenario() : null;

  const MetricComparison = ({ 
    label, 
    valueA, 
    valueB, 
    suffix = '', 
    better = 'higher' as 'higher' | 'lower',
    icon 
  }: {
    label: string;
    valueA: number;
    valueB: number;
    suffix?: string;
    better?: 'higher' | 'lower';
    icon: React.ReactNode;
  }) => {
    const isBBetter = better === 'higher' ? valueB > valueA : valueB < valueA;
    
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-sm ${!isBBetter ? 'font-semibold text-green-600' : 'text-muted-foreground'}`}>
            {valueA}{suffix}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`text-sm ${isBBetter ? 'font-semibold text-green-600' : 'text-muted-foreground'}`}>
            {valueB}{suffix}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          Compare Career Tracks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Track Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Track A (Current)</Label>
            <Select value={trackAId} onValueChange={setTrackAId}>
              <SelectTrigger>
                <SelectValue placeholder="Select first track" />
              </SelectTrigger>
              <SelectContent>
                {tracks?.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Track B (Target)</Label>
            <Select value={trackBId} onValueChange={setTrackBId}>
              <SelectTrigger>
                <SelectValue placeholder="Select second track" />
              </SelectTrigger>
              <SelectContent>
                {tracks?.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Backtrack Toggle */}
        {canCompare && (
          <div className="flex items-center space-x-2 p-3 bg-secondary/20 rounded-lg">
            <Switch 
              id="backtrack-mode" 
              checked={showBacktrack} 
              onCheckedChange={setShowBacktrack}
            />
            <Label htmlFor="backtrack-mode" className="text-sm">
              Show backtrack scenario (B → A)
            </Label>
            {showBacktrack && (
              <Badge variant="outline" className="ml-2">
                <ArrowLeft className="h-3 w-3 mr-1" />
                Reverting
              </Badge>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoadingProfiles && !canCompare && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading track data...</span>
          </div>
        )}

        {/* Comparison Results */}
        {canCompare && (
          <div className="space-y-4">
            {/* Track Headers */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold text-center">{profileA.trackTitle}</h3>
                <div className="flex justify-center gap-2 mt-2">
                  <Badge className="text-xs">{profileA.criLevel}</Badge>
                  <Badge variant="outline" className="text-xs">{profileA.riskLevel} Risk</Badge>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="font-semibold text-center">{profileB.trackTitle}</h3>
                <div className="flex justify-center gap-2 mt-2">
                  <Badge className="text-xs">{profileB.criLevel}</Badge>
                  <Badge variant="outline" className="text-xs">{profileB.riskLevel} Risk</Badge>
                </div>
              </Card>
            </div>

            {/* Metric Comparisons */}
            <div className="space-y-3">
              <MetricComparison
                label="CRI Score"
                valueA={profileA.criScore}
                valueB={profileB.criScore}
                icon={<Target className="h-4 w-4" />}
              />
              
              <MetricComparison
                label="Switch Readiness"
                valueA={profileA.switchReadiness}
                valueB={profileB.switchReadiness}
                suffix="%"
                icon={<TrendingUp className="h-4 w-4" />}
              />
              
              <MetricComparison
                label="3-Year ROI"
                valueA={Math.round(profileA.roi3yr / 1000)}
                valueB={Math.round(profileB.roi3yr / 1000)}
                suffix="k"
                icon={<DollarSign className="h-4 w-4" />}
              />
              
              <MetricComparison
                label="Overall Risk"
                valueA={profileA.overallRisk}
                valueB={profileB.overallRisk}
                suffix="%"
                better="lower"
                icon={<AlertTriangle className="h-4 w-4" />}
              />

              {(profileA.breakEvenMonths || profileB.breakEvenMonths) && (
                <MetricComparison
                  label="Break-even Time"
                  valueA={profileA.breakEvenMonths || 0}
                  valueB={showBacktrack && backtrackData ? backtrackData.newBreakEvenMonths : (profileB.breakEvenMonths || 0)}
                  suffix=" months"
                  better="lower"
                  icon={<Clock className="h-4 w-4" />}
                />
              )}
            </div>

            {/* Backtrack Analysis */}
            {showBacktrack && backtrackData && (
              <Card className="mt-4 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Backtrack Analysis: {profileB.trackTitle} → {profileA.trackTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Sunk Time:</span>
                      <span className="ml-2 font-medium text-amber-600">
                        {backtrackData.sunkTimeMonths} months
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Transfer Credit:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {backtrackData.transferCreditReclaimed}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Net Time Impact: {backtrackData.netTimeImpact > 0 ? '+' : ''}{backtrackData.netTimeImpact.toFixed(1)} months
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1">
                      Time lost from switching back, accounting for transferable experience
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  const exportData = {
                    comparison: {
                      trackA: profileA,
                      trackB: profileB,
                      backtrackMode: showBacktrack,
                      backtrackData: showBacktrack ? backtrackData : null,
                      timestamp: new Date().toISOString()
                    }
                  };
                  
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `track-comparison-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  
                  toast({
                    title: "📊 Export Complete",
                    description: "Track comparison data downloaded successfully.",
                  });
                }}
              >
                Export Comparison
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  toast({
                    title: showBacktrack ? "🔄 Planning Backtrack" : "🚀 Planning Switch",
                    description: showBacktrack 
                      ? `Initiating backtrack from ${profileB?.trackTitle || 'Track B'} to ${profileA?.trackTitle || 'Track A'}`
                      : `Initiating switch from ${profileA?.trackTitle || 'Track A'} to ${profileB?.trackTitle || 'Track B'}`,
                  });
                }}
              >
                {showBacktrack ? 'Plan Backtrack' : 'Plan Switch'}
              </Button>
            </div>
          </div>
        )}

        {/* No tracks available */}
        {!tracks || tracks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            {tracksLoading ? (
              <p>Loading your career tracks...</p>
            ) : tracksError ? (
              <div>
                <p className="mb-2">Unable to load your career tracks</p>
                <p className="text-sm">Please ensure you're logged in and have created some tracks</p>
              </div>
            ) : (
              <div>
                <p className="mb-2">No career tracks found</p>
                <p className="text-sm">Create some career tracks first to compare them</p>
              </div>
            )}
          </div>
        ) : !canCompare && trackAId && trackBId ? (
          <div className="text-center text-muted-foreground py-8">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load track data for comparison</p>
            <p className="text-sm mt-1">Track data may be loading or unavailable</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};