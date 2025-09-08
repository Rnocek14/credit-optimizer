import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCareerProfileCard } from '@/hooks/useCareerProfileCard';
import TutorialTip from '@/tutorial/TutorialTip';
import { TIPS } from '@/tutorial/tutorial-map';
import { 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  MapPin, 
  FileText, 
  GitCompare,
  Loader2,
  Award,
  Clock
} from 'lucide-react';

interface CareerProfileCardProps {
  trackId: string;
  onSimulateSwitch?: () => void;
  onExportResume?: () => void;
  onCompareTracks?: () => void;
  onOptimizeLocation?: () => void;
}

export const CareerProfileCard: React.FC<CareerProfileCardProps> = ({
  trackId,
  onSimulateSwitch,
  onExportResume,
  onCompareTracks,
  onOptimizeLocation
}) => {
  const { data: profile, isLoading, error } = useCareerProfileCard(trackId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load career profile data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getCRIColor = (level: string) => {
    switch (level) {
      case 'Expert': return 'text-primary bg-primary-light border-primary/20';
      case 'Advanced': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Intermediate': return 'text-green-600 bg-green-50 border-green-200';
      case 'Developing': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile.trackIcon && (
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: profile.trackColor || '#f3f4f6' }}
              >
                {profile.trackIcon}
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{profile.trackTitle}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Rank: {profile.rank}th percentile
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCRIColor(profile.criLevel)}`}>
                {profile.criScore}
              </div>
              <TutorialTip id="criScore" label={TIPS.criScore} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">CRI Score</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="relative w-12 h-12">
                <Progress 
                  value={profile.switchReadiness} 
                  className="w-full h-full [&>div]:rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium">{profile.switchReadiness}%</span>
                </div>
              </div>
              <TutorialTip id="switchReadiness" label={TIPS.switchReadiness} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Readiness</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Badge className={getRiskColor(profile.riskLevel)}>
                {profile.riskLevel} Risk
              </Badge>
              <TutorialTip id="riskLevel" label={TIPS.riskLevel} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{profile.overallRisk}% Score</p>
          </div>
        </div>

        {/* Financial Metrics Row */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-600">
                  ${(profile.roi3yr / 1000).toFixed(0)}k
                </span>
              </div>
              <TutorialTip id="roi3Year" label={TIPS.roi3Year} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">3-Year ROI</p>
          </div>

          {profile.breakEvenMonths && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{profile.breakEvenMonths}mo</span>
                </div>
                <TutorialTip id="breakEvenTime" label={TIPS.breakEvenTime} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Break-even</p>
            </div>
          )}

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-600">{profile.lqi}</span>
              </div>
              <TutorialTip id="lqi" label={TIPS.lqi} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">LQI</p>
          </div>
        </div>

        {/* Next Milestone */}
        {profile.nextMilestone && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Next Milestone</span>
              <TutorialTip id="nextMilestone" label={TIPS.nextMilestone} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.nextMilestone.title} • ETA: {profile.nextMilestone.eta}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {onSimulateSwitch && (
            <div className="flex items-center gap-1">
              <Button variant="outline" onClick={onSimulateSwitch} className="text-xs flex-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Simulate Switch
              </Button>
              <TutorialTip id="simulateSwitch" label={TIPS.simulateSwitch} />
            </div>
          )}
          
          {onExportResume && (
            <div className="flex items-center gap-1">
              <Button variant="outline" onClick={onExportResume} className="text-xs flex-1">
                <FileText className="h-3 w-3 mr-1" />
                Export Resume
              </Button>
              <TutorialTip id="exportResume" label={TIPS.exportResume} />
            </div>
          )}

          {onCompareTracks && (
            <div className="flex items-center gap-1">
              <Button variant="outline" onClick={onCompareTracks} className="text-xs flex-1">
                <GitCompare className="h-3 w-3 mr-1" />
                Compare Tracks
              </Button>
              <TutorialTip id="compareTracks" label={TIPS.compareTracks} />
            </div>
          )}

          {onOptimizeLocation && (
            <div className="flex items-center gap-1">
              <Button variant="outline" onClick={onOptimizeLocation} className="text-xs flex-1">
                <MapPin className="h-3 w-3 mr-1" />
                Optimize Location
              </Button>
              <TutorialTip id="optimizeLocation" label={TIPS.optimizeLocation} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};