import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  CheckCircle, 
  Calendar, 
  Star,
  TrendingUp,
  Route,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useTrackTranscript } from '@/hooks/useTrackTranscript';
import { useCourseProgress } from '@/hooks/useCourseProgress';

interface TrackFilteredTranscriptsProps {
  transcripts: any[];
  filterMode: 'all' | 'track-progress' | 'track-tagged';
  onFilterChange: (mode: 'all' | 'track-progress' | 'track-tagged') => void;
}

export function TrackFilteredTranscripts({ 
  transcripts, 
  filterMode, 
  onFilterChange 
}: TrackFilteredTranscriptsProps) {
  const activeTrackId = useActiveTrackStore(s => s.activeTrackId);
  const { usage: trackUsage } = useTrackTranscript(activeTrackId);
  const { courseProgress } = useCourseProgress(activeTrackId);

  const getFilteredTranscripts = () => {
    if (!activeTrackId || filterMode === 'all') return transcripts;
    
    if (filterMode === 'track-progress') {
      const progressCourseIds = courseProgress?.map(p => p.course_id) || [];
      return transcripts.filter(t => progressCourseIds.includes(t.id));
    }
    
    if (filterMode === 'track-tagged') {
      const taggedCourseIds = trackUsage.map(u => u.course_id);
      return transcripts.filter(t => taggedCourseIds.includes(t.id));
    }
    
    return transcripts;
  };

  const getTrackProgress = (transcriptId: string) => {
    return courseProgress?.find(p => p.course_id === transcriptId);
  };

  const isTaggedToTrack = (transcriptId: string) => {
    return trackUsage.some(u => u.course_id === transcriptId);
  };

  const getCRIScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 7.5) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 6.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTranscripts = getFilteredTranscripts();

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button 
          variant={filterMode === 'all' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => onFilterChange('all')}
        >
          <Filter className="h-3 w-3 mr-1" />
          All Transcripts
        </Button>
        {activeTrackId && (
          <>
            <Button 
              variant={filterMode === 'track-progress' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => onFilterChange('track-progress')}
            >
              <Route className="h-3 w-3 mr-1" />
              Track Progress ({courseProgress?.length || 0})
            </Button>
            <Button 
              variant={filterMode === 'track-tagged' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => onFilterChange('track-tagged')}
            >
              <Target className="h-3 w-3 mr-1" />
              Track Tagged ({trackUsage.length})
            </Button>
          </>
        )}
      </div>

      {/* Transcripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTranscripts.map((transcript) => {
          const progress = getTrackProgress(transcript.id);
          const isTagged = isTaggedToTrack(transcript.id);
          
          return (
            <Card key={transcript.id} className="shadow-sm rounded-xl hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg leading-tight">
                    {transcript.title}
                  </CardTitle>
                  <div className="flex flex-col gap-1">
                    {transcript.use_in_resume && (
                      <Badge variant="secondary" className="shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resume
                      </Badge>
                    )}
                    {isTagged && activeTrackId && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        <Target className="h-3 w-3 mr-1" />
                        Track Tagged
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {transcript.description}
                </p>

                {/* Track Progress Indicator */}
                {progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Track Progress</span>
                      <span className="font-medium">{progress.progress_percentage}%</span>
                    </div>
                    <Progress value={progress.progress_percentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Status: {progress.status}</span>
                      <span>{progress.time_spent_hours}h invested</span>
                    </div>
                  </div>
                )}

                {/* Enhanced CRI & Metadata Row */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {/* Enhanced CRI Score */}
                    <div className={`px-3 py-1 rounded-full border font-medium ${getCRIScoreColor(transcript.cri_score)}`}>
                      <Star className="h-3 w-3 inline mr-1" />
                      CRI: {transcript.cri_score.toFixed(1)}
                      <span className="ml-1 text-xs opacity-75">
                        ({transcript.cri_score >= 8.5 ? 'Excellent' : 
                          transcript.cri_score >= 7.5 ? 'High' : 
                          transcript.cri_score >= 6.5 ? 'Good' : 'Fair'})
                      </span>
                    </div>

                    {/* Difficulty */}
                    {transcript.difficulty && (
                      <Badge variant="outline" className={getDifficultyColor(transcript.difficulty)}>
                        {transcript.difficulty}
                      </Badge>
                    )}

                    {/* Grade */}
                    {transcript.grade && (
                      <Badge variant="outline" className="font-medium">
                        Grade: {transcript.grade}
                      </Badge>
                    )}
                  </div>

                  {/* CRI Contribution Indicator */}
                  {transcript.cri_score >= 7.5 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        High CRI Impact
                      </Badge>
                      <span className="text-muted-foreground">
                        {progress ? 'Boosting track progress' : 'High career readiness value'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Skill Tags */}
                {transcript.skill_tags && transcript.skill_tags.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Skills Learned:</div>
                    <div className="flex flex-wrap gap-1">
                      {transcript.skill_tags.map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cross-track validation indicator */}
                {progress && progress.track_id !== activeTrackId && (
                  <div className="flex items-center gap-2 text-xs p-2 bg-purple-50 border border-purple-200 rounded">
                    <Route className="h-3 w-3 text-purple-600" />
                    <span className="text-purple-700">
                      Also validates skills for other tracks
                    </span>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
                  <Calendar className="h-3 w-3" />
                  Completed: {format(new Date(transcript.created_at), 'MMM dd, yyyy')}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}