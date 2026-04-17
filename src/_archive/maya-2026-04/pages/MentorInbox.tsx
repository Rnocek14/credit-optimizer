import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Star, Calendar, User, ExternalLink, MessageSquare, ThumbsUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SharedResume {
  id: string;
  user_id: string;
  shared_with_email: string;
  shared_at: string;
  resume_data: any;
  ai_review_data: any;
}

interface LocalFeedback {
  rating: number;
  feedback: string;
  recommend_for_gallery: boolean;
  recommend_for_jobs: boolean;
}

export default function MentorInbox() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [resumes, setResumes] = useState<SharedResume[]>([]);
  const [localFeedback, setLocalFeedback] = useState<Record<string, LocalFeedback>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    scoreRange: 'all',
    dateRange: 'all',
    status: 'all'
  });
  const [mentorEmail, setMentorEmail] = useState(searchParams.get('email') || '');
  const [newFeedback, setNewFeedback] = useState<Record<string, { rating: number; feedback: string; recommendGallery: boolean; recommendJobs: boolean }>>({});

  useEffect(() => {
    if (mentorEmail) {
      fetchSharedResumes();
    }
  }, [mentorEmail]);

  const fetchSharedResumes = async () => {
    try {
      const { data, error } = await supabase
        .from('resume_shared_events')
        .select('*')
        .eq('shared_with_email', mentorEmail)
        .order('shared_at', { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (error) {
      console.error('Error fetching shared resumes:', error);
      toast({
        title: "Error",
        description: "Failed to load shared resumes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (resumeId: string) => {
    const fb = newFeedback[resumeId];
    if (!fb || !fb.rating) {
      toast({
        title: "Error",
        description: "Please provide a rating",
        variant: "destructive"
      });
      return;
    }

    // Store feedback locally for now (until types are updated)
    setLocalFeedback(prev => ({
      ...prev,
      [resumeId]: {
        rating: fb.rating,
        feedback: fb.feedback,
        recommend_for_gallery: fb.recommendGallery,
        recommend_for_jobs: fb.recommendJobs
      }
    }));

    toast({
      title: "Success",
      description: "Feedback submitted successfully"
    });

    // Clear the form
    setNewFeedback(prev => {
      const updated = { ...prev };
      delete updated[resumeId];
      return updated;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 95) return { label: 'Top 1%', variant: 'default' as const };
    if (score >= 90) return { label: 'Top 5%', variant: 'secondary' as const };
    if (score >= 80) return { label: 'Top 20%', variant: 'outline' as const };
    return null;
  };

  const filteredResumes = resumes.filter(resume => {
    const score = resume.ai_review_data?.overall_score || 0;
    const sharedDate = new Date(resume.shared_at);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - sharedDate.getTime()) / (1000 * 60 * 60 * 24));
    const hasFeedback = localFeedback[resume.id];

    // Score filter
    if (filters.scoreRange !== 'all') {
      const [min, max] = filters.scoreRange.split('-').map(Number);
      if (score < min || score > max) return false;
    }

    // Date filter
    if (filters.dateRange !== 'all') {
      if (filters.dateRange === '7' && daysDiff > 7) return false;
      if (filters.dateRange === '30' && daysDiff > 30) return false;
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'reviewed' && !hasFeedback) return false;
      if (filters.status === 'pending' && hasFeedback) return false;
    }

    return true;
  });

  if (!mentorEmail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Mentor Inbox Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter your mentor email"
                value={mentorEmail}
                onChange={(e) => setMentorEmail(e.target.value)}
              />
              <Button 
                onClick={() => setMentorEmail(mentorEmail)}
                className="w-full"
                disabled={!mentorEmail}
              >
                Access Inbox
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mentor Inbox</h1>
        <p className="text-muted-foreground">
          Reviewing resumes shared with {mentorEmail}
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filters.scoreRange} onValueChange={(value) => setFilters(prev => ({ ...prev, scoreRange: value }))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Score Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="90-100">90-100 (Excellent)</SelectItem>
                <SelectItem value="80-89">80-89 (Good)</SelectItem>
                <SelectItem value="70-79">70-79 (Average)</SelectItem>
                <SelectItem value="0-69">Below 70</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Review Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resumes</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="reviewed">Already Reviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resume Cards */}
      {loading ? (
        <div className="text-center py-8">Loading resumes...</div>
      ) : filteredResumes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No resumes found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredResumes.map((resume) => {
            const resumeData = resume.resume_data;
            const aiData = resume.ai_review_data;
            const score = aiData?.overall_score || 0;
            const scoreBadge = getScoreBadge(score);
            const existingFeedback = localFeedback[resume.id];
            const currentFeedback = newFeedback[resume.id] || { rating: 0, feedback: '', recommendGallery: false, recommendJobs: false };

            return (
              <Card key={resume.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {resumeData?.profile?.name || 'Anonymous'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {resumeData?.profile?.role_title} • {resumeData?.profile?.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                          {score}/100
                        </div>
                        {scoreBadge && (
                          <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* AI Summary */}
                  {aiData && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">AI Review Summary</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {aiData.summary || 'No summary available'}
                      </p>
                      {aiData.strengths && (
                        <div className="flex flex-wrap gap-1">
                          {aiData.strengths.slice(0, 3).map((strength: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {strength}
                            </Badge>
                          ))
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resume Stats */}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Shared {new Date(resume.shared_at).toLocaleDateString()}
                    </div>
                    {resumeData?.tracks && (
                      <div>
                        {resumeData.tracks.length} career track{resumeData.tracks.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {resumeData?.proof_of_learning && (
                      <div>
                        {resumeData.proof_of_learning.length} proof items
                      </div>
                    )}
                  </div>

                  {/* Existing Feedback */}
                  {existingFeedback ? (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Your Review</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < existingFeedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))
                          }
                        </div>
                      </div>
                      {existingFeedback.feedback && (
                        <p className="text-sm text-green-700 mb-2">{existingFeedback.feedback}</p>
                      )}
                      <div className="flex gap-2">
                        {existingFeedback.recommend_for_gallery && (
                          <Badge variant="secondary">Recommended for Gallery</Badge>
                        )}
                        {existingFeedback.recommend_for_jobs && (
                          <Badge variant="secondary">Recommended for Jobs</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Feedback Form */
                    <div className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Leave Feedback</h4>
                      
                      {/* Rating */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Button
                              key={star}
                              variant="ghost"
                              size="sm"
                              className="p-1"
                              onClick={() => setNewFeedback(prev => ({
                                ...prev,
                                [resume.id]: { ...currentFeedback, rating: star }
                              }))}
                            >
                              <Star
                                className={`h-5 w-5 ${star <= currentFeedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            </Button>
                          ))
                          }
                        </div>
                      </div>

                      {/* Feedback Text */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Comments</label>
                        <Textarea
                          placeholder="Share your thoughts on this candidate..."
                          value={currentFeedback.feedback}
                          onChange={(e) => setNewFeedback(prev => ({
                            ...prev,
                            [resume.id]: { ...currentFeedback, feedback: e.target.value }
                          }))}
                          rows={3}
                        />
                      </div>

                      {/* Recommendations */}
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentFeedback.recommendGallery}
                            onChange={(e) => setNewFeedback(prev => ({
                              ...prev,
                              [resume.id]: { ...currentFeedback, recommendGallery: e.target.checked }
                            }))}
                            className="rounded"
                          />
                          <span className="text-sm">Recommend for Gallery</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentFeedback.recommendJobs}
                            onChange={(e) => setNewFeedback(prev => ({
                              ...prev,
                              [resume.id]: { ...currentFeedback, recommendJobs: e.target.checked }
                            }))}
                            className="rounded"
                          />
                          <span className="text-sm">Recommend for Jobs</span>
                        </label>
                      </div>

                      <Button
                        onClick={() => submitFeedback(resume.id)}
                        disabled={!currentFeedback.rating}
                        className="w-full"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </Button>
                    </div>
                  )}

                  {/* View Full Resume */}
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`/resume/${resume.user_id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Resume
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })
          }
        </div>
      )}
    </div>
  );
}
