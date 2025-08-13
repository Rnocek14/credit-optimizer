import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Job {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  token_usage?: number;
  cost_estimate?: number;
}

export function TasksDrawer() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    
    // Set up real-time subscription for job updates
    const channel = supabase
      .channel('jobs')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'ai_analyzer_jobs' 
        },
        (payload) => {
          fetchJobs(); // Refresh jobs on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_analyzer_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getJobIcon = (status: string, jobType: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatJobType = (type: string) => {
    switch (type) {
      case 'index':
        return 'Repository Index';
      case 'review':
        return 'File Review';
      case 'refactor':
        return 'Refactor Plan';
      case 'tests':
        return 'Test Generation';
      case 'lifepath_audit':
        return 'Life Path Audit';
      default:
        return type;
    }
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'Not started';
    if (!endTime) return 'Running...';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
    return `${Math.round(durationMs / 60000)}m`;
  };

  const runningJobs = jobs.filter(job => job.status === 'running');
  const totalCost = jobs.reduce((sum, job) => sum + (job.cost_estimate || 0), 0);

  return (
    <div className="space-y-4">
      {/* Running Tasks Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Active Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runningJobs.length > 0 ? (
            <div className="space-y-3">
              {runningJobs.map((job) => (
                <div key={job.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatJobType(job.job_type)}</span>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                  <Progress value={undefined} className="h-1" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active tasks</p>
          )}
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-80">
            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Loading jobs...</p>
                </div>
              ) : jobs.length > 0 ? (
                jobs.map((job) => (
                  <div key={job.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="mt-0.5">
                      {getJobIcon(job.status, job.job_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {formatJobType(job.job_type)}
                        </span>
                        <Badge className={`${getStatusColor(job.status)} text-xs`}>
                          {job.status}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Duration: {formatDuration(job.started_at, job.completed_at)}</div>
                        {job.token_usage && (
                          <div>Tokens: {job.token_usage.toLocaleString()}</div>
                        )}
                        {job.cost_estimate && (
                          <div>Cost: ${job.cost_estimate.toFixed(4)}</div>
                        )}
                        {job.error_message && (
                          <div className="text-red-600">{job.error_message}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No jobs yet
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Budget Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Session Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Total Jobs:</span>
            <span className="font-medium">{jobs.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Completed:</span>
            <span className="font-medium">{jobs.filter(j => j.status === 'completed').length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Cost:</span>
            <span className="font-medium">${totalCost.toFixed(4)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}