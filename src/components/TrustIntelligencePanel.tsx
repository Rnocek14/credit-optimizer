import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { useTrustMetrics } from '@/hooks/useTrustMetrics';
import { Loader2, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { StarRating } from '@/components/ui/star-rating';

export function TrustIntelligencePanel() {
  const { user } = useSecureAuth();
  const { metrics, isLoading, refresh, isRefreshing } = useTrustMetrics(user?.id);
  const [rating, setRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('trust-feedback')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maya_feedback_correlations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  const submitRating = async () => {
    if (!user?.id || rating === 0) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase.rpc('dev_user_submit_maya_feedback', {
        dev_user_id: user.id,
        feedback_type_param: 'trust_panel',
        feedback_data_param: { source: 'TrustIntelligencePanel', page: 'phase7' },
        user_rating_param: rating,
      });
      if (error) throw error;
      toast({ title: 'Thanks for your feedback!', description: 'Your rating was recorded.' });
      setRating(0);
      refresh();
    } catch (err: any) {
      toast({ title: 'Could not submit feedback', description: err.message ?? 'Please try again later', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createShare = async () => {
    if (!user?.id || !metrics) {
      toast({ title: 'Nothing to share yet', description: 'Interact to generate trust metrics first.' });
      return;
    }
    try {
      setIsCreatingShare(true);
      const payload = {
        user_id: user.id,
        title: 'My Maya Trust Badge',
        metrics_snapshot: metrics as any,
        visibility: 'public' as const,
      };
      const { data, error } = await supabase
        .from('trust_badge_shares')
        .insert(payload)
        .select('share_token')
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/share/trust/${data.share_token}`;
      setShareLink(link);
      toast({ title: 'Share link created', description: 'You can share your Trust Badge publicly.' });
    } catch (err: any) {
      toast({ title: 'Could not create share link', description: err.message ?? 'Please try again later', variant: 'destructive' });
    } finally {
      setIsCreatingShare(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Trust & Intelligence</h3>
          <p className="text-sm text-muted-foreground">Real-time trust, satisfaction, and accuracy derived from user feedback</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isRefreshing || !user}>
          {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trust Score</CardTitle>
            <CardDescription>Overall confidence in Maya</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 flex items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{metrics?.trust_score?.toFixed(1) ?? '—'}</span>
                <Badge>{metrics ? '0-100' : 'No data'}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Satisfaction</CardTitle>
            <CardDescription>User-rated experience</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 flex items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{metrics?.satisfaction_score?.toFixed(1) ?? '—'}</span>
                <Badge>0-100</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Accuracy</CardTitle>
            <CardDescription>Positive outcome rate</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 flex items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{metrics?.recommendation_accuracy?.toFixed(1) ?? '—'}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feedback Volume</CardTitle>
            <CardDescription>Last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 flex items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{metrics?.feedback_volume ?? 0}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Effectiveness Trend</CardTitle>
          <CardDescription>Weekly average effectiveness (last 6 weeks)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            {isLoading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(metrics?.trend as any) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="effectiveness" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Rate Maya</CardTitle>
          <CardDescription>Your feedback improves recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StarRating rating={rating} onRatingChange={setRating} />
              <span className="text-sm text-muted-foreground">{rating > 0 ? `${rating}/5` : 'Select a rating'}</span>
            </div>
            <Button onClick={submitRating} disabled={!user || rating === 0 || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Share Trust Badge</CardTitle>
          <CardDescription>Create a public link to your current Trust metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex gap-2">
              <Button onClick={createShare} disabled={!user || !metrics || isCreatingShare} variant="outline">
                {isCreatingShare ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {shareLink ? 'Regenerate Link' : 'Create Share Link'}
              </Button>
              <Button
                onClick={() => shareLink && navigator.clipboard.writeText(shareLink).then(() => toast({ title: 'Copied to clipboard' }))}
                disabled={!shareLink}
              >
                Copy Link
              </Button>
            </div>
            {shareLink ? (
              <span className="text-xs text-muted-foreground break-all">{shareLink}</span>
            ) : (
              <span className="text-xs text-muted-foreground">No link yet</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
