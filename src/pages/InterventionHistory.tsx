import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, TrendingUp, Brain, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';
import type { DateRange } from 'react-day-picker';

interface InterventionData {
  id: string;
  intervention_type: string;
  trigger_conditions: any;
  intervention_data: any;
  confidence_score: number;
  created_at: string;
  user_response?: string;
  response_timestamp?: string;
  effectiveness_rating?: number;
}

interface EngagementSession {
  id: string;
  started_at: string;
  engagement_score: number;
  duration_minutes: number;
}

export default function InterventionHistory() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [interventionTypeFilter, setInterventionTypeFilter] = useState<string>('all');

  // Fetch interventions data
  const { data: interventions = [], isLoading: interventionsLoading } = useQuery({
    queryKey: ['interventions', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivation_interventions')
        .select('*')
        .eq('user_id', '2b458624-d498-4cca-a63d-9341cc20e363')
        .gte('created_at', dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('created_at', dateRange?.to?.toISOString() || new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InterventionData[];
    }
  });

  // Fetch engagement sessions data
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['engagement-sessions', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_engagement_sessions')
        .select('id, started_at, engagement_score, duration_minutes')
        .eq('user_id', '2b458624-d498-4cca-a63d-9341cc20e363')
        .gte('started_at', dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('started_at', dateRange?.to?.toISOString() || new Date().toISOString())
        .order('started_at', { ascending: true });

      if (error) throw error;
      return data as EngagementSession[];
    }
  });

  // Filter interventions based on type
  const filteredInterventions = interventions.filter(intervention => 
    interventionTypeFilter === 'all' || intervention.intervention_type === interventionTypeFilter
  );

  // Calculate analytics
  const interventionStats = {
    total: interventions.length,
    withResponse: interventions.filter(i => i.user_response).length,
    avgConfidence: interventions.reduce((sum, i) => sum + i.confidence_score, 0) / (interventions.length || 1),
    typeBreakdown: interventions.reduce((acc, i) => {
      acc[i.intervention_type] = (acc[i.intervention_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  // Prepare timeline data for chart
  const timelineData = sessions.map(session => {
    const nearbyIntervention = interventions.find(intervention => {
      const sessionDate = new Date(session.started_at);
      const interventionDate = new Date(intervention.created_at);
      const timeDiff = Math.abs(sessionDate.getTime() - interventionDate.getTime());
      return timeDiff <= 24 * 60 * 60 * 1000; // Within 24 hours
    });

    return {
      date: format(new Date(session.started_at), 'MMM dd'),
      engagement: session.engagement_score,
      duration: session.duration_minutes,
      hasIntervention: !!nearbyIntervention,
      interventionType: nearbyIntervention?.intervention_type
    };
  });

  const getInterventionIcon = (type: string) => {
    switch (type) {
      case 'engagement_boost': return <TrendingUp className="h-4 w-4" />;
      case 'difficulty_adjustment': return <Brain className="h-4 w-4" />;
      case 'schedule_optimization': return <Calendar className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getInterventionColor = (type: string) => {
    switch (type) {
      case 'engagement_boost': return 'bg-primary';
      case 'difficulty_adjustment': return 'bg-warning';
      case 'schedule_optimization': return 'bg-secondary';
      default: return 'bg-muted';
    }
  };

  const exportData = () => {
    const exportData = {
      interventions: filteredInterventions,
      sessions,
      analytics: interventionStats,
      dateRange,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intervention-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (interventionsLoading || sessionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intervention History</h1>
          <p className="text-muted-foreground">
            Analyze intervention patterns and their impact on learning engagement
          </p>
        </div>
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Date Range:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange?.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Type:</label>
              <Select value={interventionTypeFilter} onValueChange={setInterventionTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="engagement_boost">Engagement Boost</SelectItem>
                  <SelectItem value="difficulty_adjustment">Difficulty Adjustment</SelectItem>
                  <SelectItem value="schedule_optimization">Schedule Optimization</SelectItem>
                  <SelectItem value="general_motivation">General Motivation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Interventions</p>
                <p className="text-2xl font-bold">{interventionStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">User Responses</p>
                <p className="text-2xl font-bold">{interventionStats.withResponse}</p>
                <p className="text-xs text-muted-foreground">
                  {interventionStats.total > 0 ? Math.round((interventionStats.withResponse / interventionStats.total) * 100) : 0}% response rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{Math.round(interventionStats.avgConfidence * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Engagement Trend</p>
                <p className="text-2xl font-bold">
                  {sessions.length > 1 ? 
                    (sessions[sessions.length - 1]?.engagement_score > sessions[0]?.engagement_score ? '+' : '') +
                    Math.round(((sessions[sessions.length - 1]?.engagement_score || 0) - (sessions[0]?.engagement_score || 0)) * 100) + '%'
                  : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline Analysis</TabsTrigger>
          <TabsTrigger value="interventions">Intervention Details</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Timeline with Interventions</CardTitle>
              <CardDescription>
                Track engagement scores over time and see when interventions were triggered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" domain={[0, 1]} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    name="Engagement Score"
                    dot={(props) => props.payload.hasIntervention ? 
                      <circle r={6} fill="var(--warning)" stroke="var(--warning)" strokeWidth={2} cx={props.cx} cy={props.cy} /> :
                      <circle r={3} fill="var(--primary)" cx={props.cx} cy={props.cy} />
                    }
                  />
                  <Bar yAxisId="right" dataKey="duration" fill="var(--secondary)" name="Duration (min)" opacity={0.3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intervention History</CardTitle>
              <CardDescription>
                Detailed view of all interventions and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredInterventions.map((intervention) => (
                <Card key={intervention.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getInterventionIcon(intervention.intervention_type)}
                          <h3 className="font-semibold capitalize">
                            {intervention.intervention_type.replace('_', ' ')}
                          </h3>
                          <Badge variant="secondary" className={getInterventionColor(intervention.intervention_type)}>
                            {Math.round(intervention.confidence_score * 100)}% confidence
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(intervention.created_at), 'PPpp')}
                        </p>

                        {intervention.intervention_data?.motivation_message && (
                          <blockquote className="border-l-2 border-muted pl-4 italic text-sm">
                            {intervention.intervention_data.motivation_message}
                          </blockquote>
                        )}

                        {intervention.intervention_data?.suggested_actions && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Suggested Actions:</p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                              {intervention.intervention_data.suggested_actions.map((action: string, index: number) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {intervention.user_response && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium text-success">User Response:</p>
                            <p className="text-sm">{intervention.user_response}</p>
                            {intervention.response_timestamp && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(intervention.response_timestamp), 'PPpp')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredInterventions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No interventions found for the selected criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intervention Type Effectiveness</CardTitle>
              <CardDescription>
                Compare the effectiveness of different intervention types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(interventionStats.typeBreakdown).map(([type, count]) => ({
                  type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  count,
                  effectiveness: Math.round(Math.random() * 40 + 60) // Mock effectiveness for demo
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="var(--primary)" name="Count" />
                  <Bar yAxisId="right" dataKey="effectiveness" fill="var(--secondary)" name="Effectiveness %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Rate by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(interventionStats.typeBreakdown).map(([type, count]) => {
                    const withResponse = interventions.filter(i => 
                      i.intervention_type === type && i.user_response
                    ).length;
                    const responseRate = count > 0 ? (withResponse / count) * 100 : 0;
                    
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${responseRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {Math.round(responseRate)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intervention Triggers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Low Engagement:</span>
                    <span className="font-medium">
                      {interventions.filter(i => 
                        i.intervention_data?.intervention_reason === 'low_engagement_pattern'
                      ).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>High Difficulty:</span>
                    <span className="font-medium">
                      {interventions.filter(i => 
                        i.intervention_data?.intervention_reason === 'high_difficulty'
                      ).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Frequency:</span>
                    <span className="font-medium">
                      {interventions.filter(i => 
                        i.intervention_data?.intervention_reason === 'low_frequency'
                      ).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>General Support:</span>
                    <span className="font-medium">
                      {interventions.filter(i => 
                        i.intervention_data?.intervention_reason === 'general_support'
                      ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}