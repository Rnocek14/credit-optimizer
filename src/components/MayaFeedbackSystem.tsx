import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedbackItem {
  id: string;
  type: 'workflow_completion' | 'insight_action' | 'recommendation' | 'general';
  context: string;
  rating?: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  feedback: string;
  timestamp: Date;
  status: 'pending' | 'reviewed' | 'implemented';
}

export function MayaFeedbackSystem() {
  const { toast } = useToast();
  const [activeFeedback, setActiveFeedback] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(0);

  // Mock feedback data
  const [feedbackHistory] = useState<FeedbackItem[]>([
    {
      id: '1',
      type: 'workflow_completion',
      context: 'Career transition to Data Scientist workflow',
      rating: 5,
      sentiment: 'positive',
      feedback: 'The workflow was comprehensive and well-structured. Very helpful!',
      timestamp: new Date(Date.now() - 3600000),
      status: 'reviewed'
    },
    {
      id: '2',
      type: 'insight_action',
      context: 'Market alert for Python skills demand',
      rating: 4,
      sentiment: 'positive',
      feedback: 'Timely alert, but could include more specific course recommendations.',
      timestamp: new Date(Date.now() - 7200000),
      status: 'pending'
    },
    {
      id: '3',
      type: 'recommendation',
      context: 'Course recommendation for Machine Learning',
      rating: 3,
      sentiment: 'neutral',
      feedback: 'Good recommendations but some were too advanced for my level.',
      timestamp: new Date(Date.now() - 10800000),
      status: 'implemented'
    }
  ]);

  const handleSubmitFeedback = useCallback((type: string, context: string) => {
    if (!feedbackText && rating === 0) {
      toast({
        title: "Feedback Required",
        description: "Please provide a rating or written feedback.",
        variant: "destructive"
      });
      return;
    }

    // Simulate feedback submission
    toast({
      title: "Feedback Submitted",
      description: "Thank you! Your feedback helps improve Maya's intelligence.",
    });

    setActiveFeedback(null);
    setFeedbackText('');
    setRating(0);
  }, [feedbackText, rating, toast]);

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'workflow_completion': return <TrendingUp className="h-4 w-4" />;
      case 'insight_action': return <AlertCircle className="h-4 w-4" />;
      case 'recommendation': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Feedback Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Feedback
          </CardTitle>
          <CardDescription>
            Help Maya learn from your recent interactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Recent Workflow: Data Scientist Path</p>
                <p className="text-sm text-muted-foreground">Completed 2 minutes ago</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFeedback('workflow_1')}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Helpful
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFeedback('workflow_1')}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Needs Work
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Market Alert: Python Demand Rising</p>
                <p className="text-sm text-muted-foreground">Received 15 minutes ago</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFeedback('alert_1')}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Actionable
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFeedback('alert_1')}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Not Relevant
                </Button>
              </div>
            </div>
          </div>

          {/* Detailed Feedback Form */}
          {activeFeedback && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Detailed Feedback</h4>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Rating</label>
                <StarRating
                  rating={rating}
                  onRatingChange={setRating}
                  size="lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Comments (Optional)</label>
                <Textarea
                  placeholder="What worked well? What could be improved?"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleSubmitFeedback('workflow', 'context')}>
                  Submit Feedback
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveFeedback(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback History */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback History</CardTitle>
          <CardDescription>
            Your previous feedback and Maya's improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbackHistory.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getFeedbackTypeIcon(item.type)}
                    <div>
                      <p className="font-medium">{item.context}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getSentimentColor(item.sentiment)}>
                      {item.sentiment}
                    </Badge>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                </div>

                {item.rating && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={item.rating} readonly size="sm" />
                    <span className="text-sm text-muted-foreground">
                      {item.rating}/5 stars
                    </span>
                  </div>
                )}

                <p className="text-sm bg-muted p-3 rounded">
                  "{item.feedback}"
                </p>

                {item.status === 'implemented' && (
                  <div className="text-sm text-green-600 font-medium">
                    ✓ Maya has been improved based on this feedback
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}