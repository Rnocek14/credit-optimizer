import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, AlertTriangle, Clock, Users, MapPin, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getUserCareerTracks } from '@/lib/switching';
import { useSwitchingEngine } from '@/hooks/useSwitchingEngine';
import { useLocationSwitchOptimizer } from '@/hooks/useLocationSwitchOptimizer';
import { LocationOptimizerDrawer } from '@/components/LocationOptimizerDrawer';
import { useToast } from '@/hooks/use-toast';
import { parseError } from '@/lib/errorUtils';

interface CareerSwitchSimulatorProps {
  defaultFromTrackId?: string;
  onClose?: () => void;
}

export const CareerSwitchSimulator: React.FC<CareerSwitchSimulatorProps> = ({ 
  defaultFromTrackId,
  onClose 
}) => {
  const [fromTrackId, setFromTrackId] = useState<string>(defaultFromTrackId || '');
  const [toTrackId, setToTrackId] = useState<string>('');
  const [userAge, setUserAge] = useState<string>('30');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isLocationOptimizerOpen, setIsLocationOptimizerOpen] = useState(false);
  const { toast } = useToast();

  // Sample locations (in a real app, this would come from a database)
  const locations = [
    { id: 'sf', name: 'San Francisco, CA', salary: '+40%', col: '+60%' },
    { id: 'ny', name: 'New York, NY', salary: '+30%', col: '+50%' },
    { id: 'austin', name: 'Austin, TX', salary: '+10%', col: '+10%' },
    { id: 'toronto', name: 'Toronto, ON', salary: '-10%', col: '+20%' },
    { id: 'london', name: 'London, UK', salary: 'Base', col: '+30%' },
    { id: 'berlin', name: 'Berlin, Germany', salary: '-20%', col: 'Base' }
  ];

  const { data: tracks, isLoading: tracksLoading, error: tracksError } = useQuery({
    queryKey: ['user-career-tracks'], // Match the key used in CompareTracks
    queryFn: getUserCareerTracks,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Validate track ownership and existence
  const validateTrackId = (id?: string) => !!id && tracks?.some(t => t.id === id);
  const hasValidTracks = validateTrackId(fromTrackId) && validateTrackId(toTrackId);
  const canAnalyze = hasValidTracks && fromTrackId !== toTrackId;

  console.log('[CareerSwitchSimulator] Track validation:', {
    fromTrackId,
    toTrackId,
    hasValidFromTrack: validateTrackId(fromTrackId),
    hasValidToTrack: validateTrackId(toTrackId),
    tracksAreDifferent: fromTrackId !== toTrackId,
    canAnalyze,
    availableTracks: tracks?.length || 0
  });

  // Set default fromTrackId when prop changes or tracks load
  useEffect(() => {
    if (defaultFromTrackId && !fromTrackId) {
      console.log('Setting fromTrackId from prop:', defaultFromTrackId);
      setFromTrackId(defaultFromTrackId);
    } else if (!fromTrackId && tracks && tracks.length > 0) {
      // Auto-select first track if no default provided
      console.log('Auto-selecting first track as fromTrackId:', tracks[0].id);
      setFromTrackId(tracks[0].id);
    }
  }, [defaultFromTrackId, fromTrackId, tracks]);

  // Auto-select toTrackId when tracks are loaded and fromTrackId is set
  useEffect(() => {
    if (fromTrackId && !toTrackId && tracks && tracks.length > 1) {
      const firstOther = tracks.find(t => t.id !== fromTrackId);
      if (firstOther) {
        console.log('Auto-selecting toTrackId:', firstOther.id, firstOther.title);
        setToTrackId(firstOther.id);
      }
    }
  }, [fromTrackId, toTrackId, tracks]);

  // Use the new switching engine hook
  const { 
    data: switchingData, 
    isLoading: isAnalyzing, 
    error: switchingError,
    refetch: refetchAnalysis
  } = useSwitchingEngine({
    fromTrackId: fromTrackId || undefined,
    toTrackId: toTrackId || undefined,
    locationId: selectedLocation || 'US-NYC',
    userAge: parseInt(userAge) || 30
  });

  console.log('[CareerSwitchSimulator] Component state:', {
    fromTrackId,
    toTrackId,
    selectedLocation,
    userAge,
    canAnalyze,
    isAnalyzing,
    switchingError: switchingError?.message,
    hasData: !!switchingData,
    tracksAvailable: tracks?.length || 0,
    timestamp: new Date().toISOString()
  });

  // Parse error for user-friendly display
  const parsedError = switchingError ? parseError(switchingError) : null;

  const handleLocationSelect = (locationId: string, location: any) => {
    setSelectedLocation(locationId);
    setIsLocationOptimizerOpen(false);
    toast({
      title: "Location Selected",
      description: `Updated analysis for ${location.city}, ${location.country}`,
    });
  };

  if (tracksError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load career tracks. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Career Switch Simulator
          </h2>
          <p className="text-muted-foreground mt-1">
            Analyze the costs, benefits, and risks of switching between career tracks
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose} size="sm">
            Close
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="space-y-6 pt-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="current-track">Current Track</Label>
            <Select value={fromTrackId} onValueChange={setFromTrackId}>
              <SelectTrigger>
                <SelectValue placeholder="Select current track" />
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
            <Label htmlFor="target-track">Target Track</Label>
            <Select value={toTrackId} onValueChange={setToTrackId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target track" />
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

        {/* Additional Parameters */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="user-age">Your Age</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-age"
                type="number"
                value={userAge}
                onChange={(e) => setUserAge(e.target.value)}
                placeholder="30"
                min="18"
                max="100"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">Used for age penalty calculation</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Target Location</Label>
            <div className="flex gap-2">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsLocationOptimizerOpen(true)}
                disabled={!fromTrackId || (!toTrackId && tracks?.length < 2)}
                title="Optimize Location"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={() => toast({ title: "Analysis Complete", description: "Switch analysis updated with current parameters." })}
              disabled={!canAnalyze || isAnalyzing || tracksLoading}
              className="w-full"
              size="default"
            >
              {isAnalyzing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isAnalyzing ? 'Analyzing...' : 'Update Analysis'}
            </Button>
          </div>
        </div>

        {(parsedError || tracksError) && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  {parsedError ? 'Analysis Failed' : 'Loading Error'}
                </span>
              </div>
              {parsedError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAnalysis()}
                  className="text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
            <p className="text-sm text-destructive/80 mt-1">
              {parsedError?.userFriendlyMessage || tracksError?.message || 'Failed to load data'}
            </p>
            {parsedError?.missing && (
              <p className="text-xs text-destructive/60 mt-1">
                Missing: {parsedError.missing.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {switchingData && canAnalyze && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Analysis Results</h3>
            
            {/* Switch Metrics */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {switchingData.switchData?.metrics?.skillOverlap ?? 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Skill Overlap</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${Math.round((switchingData.switchData?.metrics?.roi3yr ?? 0) / 1000)}k
                    </div>
                    <p className="text-sm text-muted-foreground">3-Year ROI</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {switchingData.switchData?.metrics?.breakEvenMonths ?? 0}mo
                    </div>
                    <p className="text-sm text-muted-foreground">Break-even</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span>Overall Risk Level</span>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    switchingData.riskData?.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                    switchingData.riskData?.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {switchingData.riskData?.riskLevel ?? 'Low'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Risk Score: {Math.round(switchingData.riskData?.overallRisk ?? 0)}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Show message when tracks aren't selected or invalid */}
        {!canAnalyze && (
          <Card className="border-dashed">
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                <p className="mb-2">
                  {!fromTrackId || !toTrackId 
                    ? "Select your current track and target track to see detailed switching analysis"
                    : !validateTrackId(fromTrackId) || !validateTrackId(toTrackId)
                    ? "Please select tracks from your account - both track IDs are required"
                    : fromTrackId === toTrackId
                    ? "Please select different tracks to compare"
                    : "Select your current track, target track, and preferences to see detailed switching analysis"
                  }
                </p>
                {!validateTrackId(fromTrackId) && fromTrackId && (
                  <p className="text-xs text-destructive">Current track ID is invalid</p>
                )}
                {!validateTrackId(toTrackId) && toTrackId && (
                  <p className="text-xs text-destructive">Target track ID is invalid</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        </CardContent>
      </Card>

      {/* Location Optimizer Drawer */}
      <LocationOptimizerDrawer
        isOpen={isLocationOptimizerOpen}
        onClose={() => setIsLocationOptimizerOpen(false)}
        fromTrackId={fromTrackId}
        toTrackId={toTrackId || (tracks?.find(t => t.id !== fromTrackId)?.id)}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
};