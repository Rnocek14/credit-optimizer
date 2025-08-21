import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCareerProfileCard } from '@/hooks/useCareerProfileCard';
import { useBacktrackAnalyzer } from '@/hooks/useBacktrackAnalyzer';
import { getUserCareerTracks } from '@/lib/switching';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowRightLeft, 
  TrendingUp, 
  Shield, 
  Clock, 
  DollarSign,
  MapPin,
  Award,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CompareTracks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [trackAId, setTrackAId] = useState(searchParams.get('a') || '');
  const [trackBId, setTrackBId] = useState(searchParams.get('b') || '');
  const [showBacktrack, setShowBacktrack] = useState(searchParams.get('backtrack') === '1');

  // Fetch user tracks
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['user-career-tracks'],
    queryFn: getUserCareerTracks,
    staleTime: 5 * 60 * 1000
  });

  // Fetch profile data for both tracks
  const { data: profileA, isLoading: loadingA, error: errorA } = useCareerProfileCard(trackAId);
  const { data: profileB, isLoading: loadingB, error: errorB } = useCareerProfileCard(trackBId);

  console.log('CompareTracks: Profile data state:', {
    trackAId, trackBId, 
    profileA: profileA ? 'loaded' : 'null',
    profileB: profileB ? 'loaded' : 'null',
    loadingA, loadingB, errorA, errorB
  });

  // Backtrack analysis (B→A scenario)
  const { 
    data: backtrackData, 
    isLoading: backtrackLoading 
  } = useBacktrackAnalyzer({
    fromTrackId: trackBId,
    toTrackId: trackAId,
    enabled: showBacktrack && !!trackAId && !!trackBId
  });

  // Auto-populate missing track IDs when tracks are loaded
  useEffect(() => {
    if (tracks && tracks.length > 0) {
      // If no trackA selected, use first track
      if (!trackAId) {
        const firstTrack = tracks[0];
        console.log('Auto-selecting Track A:', firstTrack.id, firstTrack.title);
        setTrackAId(firstTrack.id);
      }
      
      // If trackA is selected but no trackB, use the next available track
      if (trackAId && !trackBId) {
        const otherTrack = tracks.find(t => t.id !== trackAId);
        if (otherTrack) {
          console.log('Auto-selecting Track B:', otherTrack.id, otherTrack.title);
          setTrackBId(otherTrack.id);
        }
      }
    }
  }, [tracks, trackAId, trackBId]);

  // Update URL when selections change
  useEffect(() => {
    const params = new URLSearchParams();
    if (trackAId) params.set('a', trackAId);
    if (trackBId) params.set('b', trackBId);
    if (showBacktrack) params.set('backtrack', '1');
    
    setSearchParams(params);
  }, [trackAId, trackBId, showBacktrack, setSearchParams]);

  const handleSwapTracks = () => {
    const tempA = trackAId;
    setTrackAId(trackBId);
    setTrackBId(tempA);
  };

  const handlePlanSwitch = (direction: 'a-to-b' | 'b-to-a') => {
    const from = direction === 'a-to-b' ? trackAId : trackBId;
    const to = direction === 'a-to-b' ? trackBId : trackAId;
    navigate(`/plan?switch=1&from=${from}&to=${to}`);
  };

  const handleExportComparison = () => {
    if (!profileA || !profileB) return;
    
    const comparisonData = {
      trackA: {
        name: profileA.trackTitle,
        criScore: profileA.criScore,
        readiness: profileA.switchReadiness,
        risk: profileA.overallRisk,
        roi3yr: profileA.roi3yr,
        lqi: profileA.lqi,
        breakEven: profileA.breakEvenMonths
      },
      trackB: {
        name: profileB.trackTitle,
        criScore: profileB.criScore,
        readiness: profileB.switchReadiness,
        risk: profileB.overallRisk,
        roi3yr: profileB.roi3yr,
        lqi: profileB.lqi,
        breakEven: profileB.breakEvenMonths
      },
      backtrackAnalysis: showBacktrack ? backtrackData : null,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(comparisonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `track-comparison-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Comparison Exported",
      description: "Track comparison data has been downloaded",
    });
  };

  const canCompare = trackAId && trackBId && profileA && profileB;
  
  console.log('CompareTracks: Comparison state:', {
    canCompare, trackAId: !!trackAId, trackBId: !!trackBId,
    profileA: !!profileA, profileB: !!profileB
  });

  const MetricComparison: React.FC<{
    label: string;
    valueA: number | string | React.ReactNode;
    valueB: number | string | React.ReactNode;
    suffix?: string;
    higherIsBetter?: boolean;
    icon?: React.ReactNode;
  }> = ({ label, valueA, valueB, suffix = '', higherIsBetter = true, icon }) => {
    const numA = typeof valueA === 'string' ? parseFloat(valueA) || 0 : typeof valueA === 'number' ? valueA : 0;
    const numB = typeof valueB === 'string' ? parseFloat(valueB) || 0 : typeof valueB === 'number' ? valueB : 0;
    
    const betterA = higherIsBetter ? numA > numB : numA < numB;
    const betterB = higherIsBetter ? numB > numA : numB < numA;

    return (
      <div className="flex items-center justify-between py-3 border-b last:border-b-0">
        <div className="flex items-center gap-2 font-medium">
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-right ${betterA ? 'font-bold text-green-600' : ''}`}>
            {valueA}{suffix}
          </div>
          <div className="text-muted-foreground">vs</div>
          <div className={`text-right ${betterB ? 'font-bold text-green-600' : ''}`}>
            {valueB}{suffix}
          </div>
        </div>
      </div>
    );
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compare Tracks</h1>
          <p className="text-muted-foreground">
            Side-by-side analysis of your career tracks
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/plan')}>
            Back to Plans
          </Button>
        </div>
      </div>

      {/* Track Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Track Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>Track A (Current)</Label>
              <Select value={trackAId} onValueChange={setTrackAId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select track A" />
                </SelectTrigger>
                <SelectContent>
                  {tracksLoading ? (
                    <div className="p-2">Loading tracks...</div>
                  ) : (
                    tracks.map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        {track.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              size="icon"
              onClick={handleSwapTracks}
              disabled={!trackAId || !trackBId}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 space-y-2">
              <Label>Track B (Target)</Label>
              <Select value={trackBId} onValueChange={setTrackBId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select track B" />
                </SelectTrigger>
                <SelectContent>
                  {tracksLoading ? (
                    <div className="p-2">Loading tracks...</div>
                  ) : (
                    tracks.filter(t => t.id !== trackAId).map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        {track.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="backtrack-mode"
              checked={showBacktrack}
              onCheckedChange={setShowBacktrack}
            />
            <Label htmlFor="backtrack-mode">
              Show Backtrack Scenario (B → A)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {canCompare ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Comparison */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Track Comparison
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">{profileA.trackTitle}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-medium">{profileB.trackTitle}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <MetricComparison
                  label="CRI Score"
                  valueA={profileA.criScore}
                  valueB={profileB.criScore}
                  icon={<Award className="h-4 w-4" />}
                />
                
                <MetricComparison
                  label="Switch Readiness"
                  valueA={profileA.switchReadiness}
                  valueB={profileB.switchReadiness}
                  suffix="%"
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                
                <MetricComparison
                  label="Risk Level"
                  valueA={
                    <Badge className={getRiskColor(profileA.riskLevel)}>
                      {profileA.riskLevel} ({profileA.overallRisk}%)
                    </Badge>
                  }
                  valueB={
                    <Badge className={getRiskColor(profileB.riskLevel)}>
                      {profileB.riskLevel} ({profileB.overallRisk}%)
                    </Badge>
                  }
                  higherIsBetter={false}
                  icon={<Shield className="h-4 w-4" />}
                />
                
                <MetricComparison
                  label="3-Year ROI"
                  valueA={Math.round(profileA.roi3yr / 1000)}
                  valueB={Math.round(profileB.roi3yr / 1000)}
                  suffix="k"
                  icon={<DollarSign className="h-4 w-4" />}
                />
                
                <MetricComparison
                  label="LQI"
                  valueA={profileA.lqi}
                  valueB={profileB.lqi}
                  icon={<MapPin className="h-4 w-4" />}
                />
                
                {(profileA.breakEvenMonths || profileB.breakEvenMonths) && (
                  <MetricComparison
                    label="Break-even Time"
                    valueA={profileA.breakEvenMonths || 'N/A'}
                    valueB={profileB.breakEvenMonths || 'N/A'}
                    suffix="mo"
                    higherIsBetter={false}
                    icon={<Clock className="h-4 w-4" />}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Backtrack Analysis */}
          {showBacktrack && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeft className="h-5 w-5" />
                  Backtrack Analysis ({profileB?.trackTitle} → {profileA?.trackTitle})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {backtrackLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : backtrackData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {backtrackData.sunkTimeMonths}mo
                      </div>
                      <div className="text-sm text-muted-foreground">Sunk Time</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {backtrackData.transferCreditReclaimed}%
                      </div>
                      <div className="text-sm text-muted-foreground">Transfer Credit</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {backtrackData.newBreakEvenMonths}mo
                      </div>
                      <div className="text-sm text-muted-foreground">New Break-even</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        backtrackData.netTimeImpactMonths > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {backtrackData.netTimeImpactMonths > 0 ? '+' : ''}{backtrackData.netTimeImpactMonths}mo
                      </div>
                      <div className="text-sm text-muted-foreground">Net Time Impact</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No backtrack data available
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="space-y-2">
                <p>Select both tracks to see the comparison</p>
                {tracksLoading && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading tracks...</span>
                  </div>
                )}
                {!tracksLoading && tracks.length === 0 && (
                  <p className="text-sm">No tracks available. Please create some tracks first.</p>
                )}
                {errorA && (
                  <p className="text-sm text-red-600">Error loading Track A data: {errorA.message}</p>
                )}
                {errorB && (
                  <p className="text-sm text-red-600">Error loading Track B data: {errorB.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {canCompare && (
        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => handlePlanSwitch('a-to-b')}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Plan Switch (A → B)
          </Button>
          
          {showBacktrack && (
            <Button 
              variant="outline"
              onClick={() => handlePlanSwitch('b-to-a')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Plan Backtrack (B → A)
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={handleExportComparison}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Comparison
          </Button>
        </div>
      )}
    </div>
  );
};