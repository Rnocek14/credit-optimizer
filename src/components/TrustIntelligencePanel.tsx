import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { useTrustMetrics } from '@/hooks/useTrustMetrics';
import { Loader2, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export function TrustIntelligencePanel() {
  const { user } = useSecureAuth();
  const { metrics, isLoading, refresh, isRefreshing } = useTrustMetrics(user?.id);

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
    </div>
  );
}
