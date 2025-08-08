import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface DemoLearner {
  id: string;
  name: string;
  track: string;
  progress: number;
  avgCRI: number;
}

const demoLearners: DemoLearner[] = [
  { id: '1', name: 'Alice Johnson', track: 'Web Development', progress: 85, avgCRI: 4.2 },
  { id: '2', name: 'Bob Smith', track: 'Data Science', progress: 72, avgCRI: 3.8 },
  { id: '3', name: 'Carol Davis', track: 'UX Design', progress: 90, avgCRI: 4.5 },
  { id: '4', name: 'David Wilson', track: 'DevOps', progress: 68, avgCRI: 3.9 },
  { id: '5', name: 'Eva Brown', track: 'Mobile Development', progress: 78, avgCRI: 4.1 },
];

const Institution: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const avgCompletionRate = Math.round(demoLearners.reduce((sum, learner) => sum + learner.progress, 0) / demoLearners.length);
  const avgCRIScore = Math.round((demoLearners.reduce((sum, learner) => sum + learner.avgCRI, 0) / demoLearners.length) * 10) / 10;

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Institution Hub | Learning Analytics Dashboard</title>
        <meta name="description" content="Monitor cohort progress and learning analytics for educational institutions" />
        <link rel="canonical" href="/institution" />
      </Helmet>

      {!isAuthenticated && (
        <div data-testid="demo-guard-banner" className="bg-blue-100 border-b border-blue-200 p-4">
          <div className="container mx-auto">
            <p className="text-blue-800 text-center">
              <strong>Demo Mode:</strong> You're viewing the Institution Hub in demo mode. 
              <a href="/auth" className="underline ml-2">Sign in</a> for full access.
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Institution Hub</h1>
          <p className="text-muted-foreground">
            Monitor cohort progress and track learning outcomes
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Learners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{demoLearners.length}</div>
              <p className="text-xs text-muted-foreground">Active in cohort</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCompletionRate}%</div>
              <Progress value={avgCompletionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg CRI Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCRIScore}</div>
              <p className="text-xs text-muted-foreground">Out of 5.0</p>
            </CardContent>
          </Card>
        </div>

        {/* Cohort Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Cohort Overview</CardTitle>
            <CardDescription>Track individual learner progress and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoLearners.map((learner) => (
                <div key={learner.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-medium">{learner.name}</h4>
                        <p className="text-sm text-muted-foreground">{learner.track}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-sm font-medium">{learner.progress}%</div>
                      <Progress value={learner.progress} className="w-20 mt-1" />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium">CRI: {learner.avgCRI}</div>
                      <Badge variant={learner.avgCRI >= 4 ? "default" : learner.avgCRI >= 3.5 ? "secondary" : "outline"}>
                        {learner.avgCRI >= 4 ? "Excellent" : learner.avgCRI >= 3.5 ? "Good" : "Needs Support"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Institution;