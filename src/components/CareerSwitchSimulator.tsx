import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, AlertTriangle, Clock, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyzeCareerSwitch, getUserCareerTracks, type CareerSwitchAnalysis } from '@/lib/switching';
import { CareerSwitchResults } from '@/components/CareerSwitchResults';
import { useToast } from '@/hooks/use-toast';

export const CareerSwitchSimulator = () => {
  const [fromTrackId, setFromTrackId] = useState<string>('');
  const [toTrackId, setToTrackId] = useState<string>('');
  const [userAge, setUserAge] = useState<string>('30');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CareerSwitchAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
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
    queryKey: ['career-tracks'],
    queryFn: getUserCareerTracks,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleAnalyze = async () => {
    if (!fromTrackId || !toTrackId) {
      toast({
        title: "Missing Selection",
        description: "Please select both current and target career tracks.",
        variant: "destructive",
      });
      return;
    }

    if (fromTrackId === toTrackId) {
      toast({
        title: "Invalid Selection",
        description: "Please select different tracks for comparison.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeCareerSwitch(
        fromTrackId, 
        toTrackId, 
        selectedLocation || undefined,
        parseInt(userAge) || 30
      );
      setAnalysis(result);
      toast({
        title: "Analysis Complete",
        description: "Career switch analysis has been calculated successfully.",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Career Switch Simulator
        </CardTitle>
        <CardDescription>
          Analyze the costs, benefits, and risks of switching between career tracks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
        <div className="grid md:grid-cols-2 gap-4">
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
            <Label htmlFor="location">Target Location (Optional)</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select target location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{location.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {location.salary} salary, {location.col} COL
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleAnalyze}
          disabled={!fromTrackId || !toTrackId || isAnalyzing || tracksLoading}
          className="w-full"
          size="lg"
        >
          {isAnalyzing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isAnalyzing ? 'Analyzing...' : 'Simulate Career Switch'}
        </Button>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Analysis Error</span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}

        {analysis && <CareerSwitchResults analysis={analysis} />}
      </CardContent>
    </Card>
  );
};