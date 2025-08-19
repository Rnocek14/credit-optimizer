import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Target, 
  Clock, 
  TrendingUp, 
  Star,
  Award,
  Users,
  Zap
} from 'lucide-react';
import type { CareerTrack } from '@/types/tracks';

interface TrackStats {
  courseCount: number;
  completedCourses: number;
  totalXP: number;
  estimatedProgress: number;
  avgCRI?: number;
  skillsCount?: number;
  timeInvested?: number;
  difficultyLevel?: number;
}

interface TrackComparisonViewProps {
  tracks: CareerTrack[];
  trackStats: Record<string, TrackStats>;
  onRemoveTrack: (trackId: string) => void;
}

export function TrackComparisonView({ tracks, trackStats, onRemoveTrack }: TrackComparisonViewProps) {
  if (tracks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Tracks Selected</h3>
        <p className="text-sm text-muted-foreground">
          Select tracks from the Manage tab to compare their progress and statistics.
        </p>
      </Card>
    );
  }

  const maxValues = {
    courseCount: Math.max(...tracks.map(t => (trackStats[t.id] || {}).courseCount || 0)),
    totalXP: Math.max(...tracks.map(t => (trackStats[t.id] || {}).totalXP || 0)),
    estimatedProgress: Math.max(...tracks.map(t => (trackStats[t.id] || {}).estimatedProgress || 0)),
    avgCRI: Math.max(...tracks.map(t => (trackStats[t.id] || {}).avgCRI || 0)),
    skillsCount: Math.max(...tracks.map(t => (trackStats[t.id] || {}).skillsCount || 0)),
    timeInvested: Math.max(...tracks.map(t => (trackStats[t.id] || {}).timeInvested || 0)),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Track Comparison ({tracks.length}/3)
          </h3>
          <p className="text-sm text-muted-foreground">
            Compare progress, skills, and outcomes across your career tracks.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tracks.map((track) => {
          const stats = trackStats[track.id] || {};
          return (
            <Card key={track.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{track.icon || '💻'}</span>
                    <div>
                      <CardTitle className="text-base">{track.track_name || track.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {track.goal || 'No goal set'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveTrack(track.id)}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    Remove
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{(stats as any).courseCount || 0}</div>
                    <div className="text-muted-foreground">Courses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{(stats as any).totalXP || 0}</div>
                    <div className="text-muted-foreground">XP</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{(stats as any).estimatedProgress || 0}%</span>
                  </div>
                  <Progress value={(stats as any).estimatedProgress || 0} className="h-2" />
                </div>

                {((stats as any).avgCRI || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Avg CRI
                    </span>
                    <Badge variant="outline">{((stats as any).avgCRI || 0).toFixed(1)}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Metric</th>
                  {tracks.map((track) => (
                    <th key={track.id} className="text-center py-2 min-w-[120px]">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-lg">{track.icon || '💻'}</span>
                        <span className="text-sm truncate">{track.track_name || track.title}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="space-y-2">
                {/* Course Count */}
                <tr className="border-b">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Total Courses
                  </td>
                  {tracks.map((track) => {
                    const value = (trackStats[track.id] || {}).courseCount || 0;
                    const percentage = maxValues.courseCount ? (value / maxValues.courseCount) * 100 : 0;
                    return (
                      <td key={track.id} className="text-center py-3">
                        <div className="space-y-1">
                          <div className="font-semibold">{value}</div>
                          <Progress value={percentage} className="h-1" />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Completed Courses */}
                <tr className="border-b">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Completed
                  </td>
                  {tracks.map((track) => {
                    const value = (trackStats[track.id] || {}).completedCourses || 0;
                    const total = (trackStats[track.id] || {}).courseCount || 0;
                    const percentage = total ? (value / total) * 100 : 0;
                    return (
                      <td key={track.id} className="text-center py-3">
                        <div className="space-y-1">
                          <div className="font-semibold">{value}/{total}</div>
                          <Progress value={percentage} className="h-1" />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Total XP */}
                <tr className="border-b">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Total XP
                  </td>
                  {tracks.map((track) => {
                    const value = (trackStats[track.id] || {}).totalXP || 0;
                    const percentage = maxValues.totalXP ? (value / maxValues.totalXP) * 100 : 0;
                    return (
                      <td key={track.id} className="text-center py-3">
                        <div className="space-y-1">
                          <div className="font-semibold">{value.toLocaleString()}</div>
                          <Progress value={percentage} className="h-1" />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Average CRI */}
                <tr className="border-b">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Avg CRI Score
                  </td>
                  {tracks.map((track) => {
                    const value = (trackStats[track.id] || {}).avgCRI || 0;
                    const percentage = maxValues.avgCRI ? (value / maxValues.avgCRI) * 100 : 0;
                    return (
                      <td key={track.id} className="text-center py-3">
                        <div className="space-y-1">
                          <div className="font-semibold">{value.toFixed(1)}</div>
                          <Progress value={percentage} className="h-1" />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Skills Count */}
                <tr className="border-b">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Skills Developed
                  </td>
                  {tracks.map((track) => {
                    const value = (trackStats[track.id] || {}).skillsCount || 0;
                    const percentage = maxValues.skillsCount ? (value / maxValues.skillsCount) * 100 : 0;
                    return (
                      <td key={track.id} className="text-center py-3">
                        <div className="space-y-1">
                          <div className="font-semibold">{value}</div>
                          <Progress value={percentage} className="h-1" />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Time Invested */}
                <tr>
                  <td className="py-3 font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Invested (hrs)
                  </td>
                  {tracks.map((track) => {
                    const value = (trackStats[track.id] || {}).timeInvested || 0;
                    const percentage = maxValues.timeInvested ? (value / maxValues.timeInvested) * 100 : 0;
                    return (
                      <td key={track.id} className="text-center py-3">
                        <div className="space-y-1">
                          <div className="font-semibold">{value}</div>
                          <Progress value={percentage} className="h-1" />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {(() => {
              const topXPTrack = tracks.reduce((max, track) => 
                ((trackStats[track.id] || {}).totalXP || 0) > ((trackStats[max.id] || {}).totalXP || 0) ? track : max
              );
              const topProgressTrack = tracks.reduce((max, track) => 
                ((trackStats[track.id] || {}).estimatedProgress || 0) > ((trackStats[max.id] || {}).estimatedProgress || 0) ? track : max
              );
              
              return (
                <>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">🏆</Badge>
                    <div>
                      <span className="font-medium">{topXPTrack.track_name || topXPTrack.title}</span> has the highest XP 
                      ({(trackStats[topXPTrack.id] || {}).totalXP || 0} points), showing strong engagement.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">🎯</Badge>
                    <div>
                      <span className="font-medium">{topProgressTrack.track_name || topProgressTrack.title}</span> has the highest completion rate 
                      ({(trackStats[topProgressTrack.id] || {}).estimatedProgress || 0}%), indicating focused progress.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">💡</Badge>
                    <div>
                      Consider consolidating tracks with similar skills or focusing effort on the track with highest market demand.
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}