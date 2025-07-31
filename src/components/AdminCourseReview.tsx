import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, Star, Users, Award, TrendingUp } from 'lucide-react';

interface CourseSubmission {
  id: string;
  title: string;
  description: string;
  platform: string;
  duration_hours: number;
  difficulty: string;
  cost: number;
  skill_tags: string[];
  instructor_name: string;
  instructor_rating: number;
  has_projects: boolean;
  cri_score: number;
  cri_breakdown: any;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  user_id: string;
}

export const AdminCourseReview = () => {
  const [submissions, setSubmissions] = useState<CourseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('course_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error("Failed to load course submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, action: 'approve' | 'reject') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }

      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) return;

      // Update submission status
      const { error: updateError } = await supabase
        .from('course_submissions')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_notes: reviewNotes[submissionId] || ''
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // If approved, add to recommended_courses
      if (action === 'approve') {
        const { error: insertError } = await supabase
          .from('recommended_courses')
          .insert([{
            title: submission.title,
            description: submission.description,
            platform: submission.platform,
            difficulty: submission.difficulty,
            cost: submission.cost.toString(),
            skill_tags: submission.skill_tags,
            mentor_id: submission.user_id,
            url: '',
            active: true
          }]);

        if (insertError) throw insertError;
      }

      toast.success(`Course ${action}d successfully`);
      fetchSubmissions();
    } catch (error) {
      console.error('Error reviewing submission:', error);
      toast.error(`Failed to ${action} course`);
    }
  };

  const getCRIColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Course Review Dashboard</h1>
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Course Review Dashboard</h1>
      
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Course Submissions</h3>
            <p className="text-muted-foreground">All course submissions have been reviewed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {submissions.map((submission) => (
            <Card key={submission.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      {submission.title}
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Submitted on {new Date(submission.submitted_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getCRIColor(submission.cri_score)}`}>
                      {Math.round(submission.cri_score)}%
                    </div>
                    <div className="text-sm text-muted-foreground">CRI Score</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Course Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Course Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Platform:</span> {submission.platform}</div>
                      <div><span className="font-medium">Duration:</span> {submission.duration_hours} hours</div>
                      <div><span className="font-medium">Difficulty:</span> {submission.difficulty}</div>
                      <div><span className="font-medium">Cost:</span> ${submission.cost}</div>
                      <div><span className="font-medium">Projects:</span> {submission.has_projects ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Instructor</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Name:</span> {submission.instructor_name}</div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Rating:</span>
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        {submission.instructor_rating}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{submission.description}</p>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="font-medium mb-2">Skills Covered</h4>
                  <div className="flex flex-wrap gap-2">
                    {submission.skill_tags.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>

                {/* CRI Breakdown */}
                {submission.cri_breakdown && (
                  <div>
                    <h4 className="font-medium mb-3">CRI Score Breakdown</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(submission.cri_breakdown).map(([key, value]) => {
                        if (key === 'overall_score') return null;
                        const score = typeof value === 'number' ? value : 0;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                              <span>{Math.round(score)}%</span>
                            </div>
                            <Progress value={score} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Review Section */}
                {submission.status === 'pending' && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Review Notes</h4>
                    <Textarea
                      placeholder="Add review notes (optional)..."
                      value={reviewNotes[submission.id] || ''}
                      onChange={(e) => setReviewNotes(prev => ({
                        ...prev,
                        [submission.id]: e.target.value
                      }))}
                      className="mb-4"
                    />
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleReview(submission.id, 'approve')}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve Course
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReview(submission.id, 'reject')}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject Course
                      </Button>
                    </div>
                  </div>
                )}

                {/* Review Result */}
                {submission.status !== 'pending' && (
                  <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {submission.status === 'approved' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    Course {submission.status} {submission.reviewed_at && `on ${new Date(submission.reviewed_at).toLocaleDateString()}`}
                  </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};