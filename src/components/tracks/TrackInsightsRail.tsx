import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Award, Clock, BarChart3, FileText, Copy, ExternalLink } from 'lucide-react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { supabase } from '@/integrations/supabase/client';
import { trackTelemetryEvent } from '@/utils/telemetry';

interface TrackInsight {
  cri_trend: Array<{ day: string; cri_score: number }>;
  recent_activity: Array<{ type: string; date: string; title: string }>;
  next_milestones: Array<{ title: string; target_date: string; progress: number }>;
}

interface TrackProgress {
  track_id: string;
  track_name: string;
  title: string;
  color: string;
  icon: string;
  xp: number;
  badges: number;
  goals: number;
  cri_score: number;
  risk_score: number;
  roi_score: number;
}

export function TrackInsightsRail() {
  const { activeTrackId } = useActiveTrackStore();
  const [insights, setInsights] = useState<TrackInsight | null>(null);
  const [progress, setProgress] = useState<TrackProgress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeTrackId) return;

    const fetchTrackData = async () => {
      setLoading(true);
      try {
        // Fetch track insights
        const { data: insightsData, error: insightsError } = await supabase
          .rpc('get_track_insights', { p_track_id: activeTrackId });

        if (insightsError) {
          console.error('Error fetching track insights:', insightsError);
        } else if (insightsData) {
          setInsights(insightsData as unknown as TrackInsight);
        }

        // Fetch track progress from view
        const { data: progressData, error: progressError } = await supabase
          .from('user_track_progress_v')
          .select('*')
          .eq('track_id', activeTrackId)
          .single();

        if (progressError) {
          console.error('Error fetching track progress:', progressError);
        } else {
          setProgress(progressData);
        }
      } catch (error) {
        console.error('Error fetching track data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackData();
  }, [activeTrackId]);

  const handleCompareTracksClick = () => {
    trackTelemetryEvent({
      task: 'track_compare_initiated',
      complexity: { source: 'insights_rail', active_track: activeTrackId }
    });
  };

  const handleCloneTrackClick = () => {
    trackTelemetryEvent({
      task: 'track_clone_initiated', 
      complexity: { source: 'insights_rail', active_track: activeTrackId }
    });
  };

  const handleExportResume = () => {
    trackTelemetryEvent({
      task: 'resume_export_initiated',
      complexity: { source: 'insights_rail', track_id: activeTrackId }
    });
  };

  if (!activeTrackId) {
    return (
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Active Track</h3>
            <p className="text-muted-foreground">
              Select a career track to view insights and progress metrics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criTrend = insights?.cri_trend?.slice(0, 7) || [];
  const criDelta = criTrend.length >= 2 
    ? criTrend[0]?.cri_score - criTrend[criTrend.length - 1]?.cri_score 
    : 0;

  return (
    <div className="space-y-4 p-4">
      {/* Track Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {progress?.icon && <span>{progress.icon}</span>}
            Track Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CRI Score with Trend */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Career Readiness</p>
              <p className="text-2xl font-bold">
                {Math.round(progress?.cri_score || 0)}
                <span className="text-sm text-muted-foreground ml-1">/100</span>
              </p>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className={`h-4 w-4 ${
                criDelta >= 0 ? 'text-green-500' : 'text-red-500'
              }`} />
              <span className={`text-sm font-medium ${
                criDelta >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {criDelta >= 0 ? '+' : ''}{Math.round(criDelta)} WoW
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Award className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-xl font-semibold">{progress?.badges || 0}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Target className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xl font-semibold">{progress?.goals || 0}</p>
              <p className="text-xs text-muted-foreground">Goals</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <BarChart3 className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xl font-semibold">{progress?.xp || 0}</p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </div>

          {/* Risk & ROI Indicators */}
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              Risk: {Math.round(progress?.risk_score || 0)}%
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ROI: {Math.round(progress?.roi_score || 0)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {insights?.recent_activity && insights.recent_activity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.recent_activity.slice(0, 3).map((activity, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-muted-foreground flex-1 truncate">
                    {activity.title}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Milestones */}
      {insights?.next_milestones && insights.next_milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Next Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.next_milestones.slice(0, 2).map((milestone, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {milestone.title}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {milestone.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${milestone.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={handleCompareTracksClick}
          >
            <BarChart3 className="h-4 w-4" />
            Compare Tracks
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={handleCloneTrackClick}
          >
            <Copy className="h-4 w-4" />
            Clone Track
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={handleExportResume}
          >
            <FileText className="h-4 w-4" />
            Export Resume
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}