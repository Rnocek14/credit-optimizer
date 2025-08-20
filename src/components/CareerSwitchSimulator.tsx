import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyzeCareerSwitch, getUserCareerTracks, type CareerSwitchAnalysis } from '@/lib/switching';
import { useToast } from '@/hooks/use-toast';

export const CareerSwitchSimulator = () => {
  const [fromTrackId, setFromTrackId] = useState<string>('');
  const [toTrackId, setToTrackId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CareerSwitchAnalysis | null>(null);
  const { toast } = useToast();

  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: ['career-tracks'],
    queryFn: getUserCareerTracks,
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
    try {
      const result = await analyzeCareerSwitch(fromTrackId, toTrackId);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze career switch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-success';
      case 'Medium': return 'text-warning';
      case 'High': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
            <label className="text-sm font-medium">Current Track</label>
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
            <label className="text-sm font-medium">Target Track</label>
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

        <Button 
          onClick={handleAnalyze}
          disabled={!fromTrackId || !toTrackId || isAnalyzing || tracksLoading}
          className="w-full"
        >
          {isAnalyzing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Simulate Career Switch
        </Button>

        {analysis && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {analysis.tracks.from} → {analysis.tracks.to}
              </h3>
              <Badge 
                variant="outline" 
                className={getRiskColor(analysis.riskAnalysis.riskLevel)}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {analysis.riskAnalysis.riskLevel} Risk
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {analysis.metrics.skillOverlap}%
                </div>
                <div className="text-sm text-muted-foreground">Skill Overlap</div>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(analysis.metrics.roi3yr)}
                </div>
                <div className="text-sm text-muted-foreground">3-Year ROI</div>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-warning">
                  {formatCurrency(analysis.metrics.switchCost)}
                </div>
                <div className="text-sm text-muted-foreground">Switch Cost</div>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {analysis.metrics.breakEvenMonths}
                </div>
                <div className="text-sm text-muted-foreground">Months to Break Even</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Investment
              </h4>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Saved:</span>
                  <span className="font-medium text-success">
                    {Math.round(analysis.metrics.timeGained / 40)} weeks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional Time:</span>
                  <span className="font-medium text-warning">
                    {Math.round(analysis.metrics.timeLost / 40)} weeks
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Factors
              </h4>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI Automation Risk:</span>
                  <span className="font-medium">{analysis.riskAnalysis.breakdown.automation_risk}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Switch Difficulty:</span>
                  <span className="font-medium">{analysis.riskAnalysis.breakdown.switch_difficulty}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Volatility:</span>
                  <span className="font-medium">{analysis.riskAnalysis.breakdown.market_volatility}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skill Mismatch:</span>
                  <span className="font-medium">{analysis.riskAnalysis.breakdown.skill_mismatch}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};