import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Bell, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Plus,
  Settings,
  BarChart3,
  Target,
  Clock,
  Star,
  Trash2,
  Edit
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AlertConfiguration {
  id?: string;
  name: string;
  alert_type: string;
  career_path: string;
  location: string;
  metric_type: string;
  threshold_value: number;
  comparison_operator: string;
  time_window: string;
  pattern_config: any;
  is_active: boolean;
}

interface AlertHistory {
  id: string;
  alert_config_id: string;
  triggered_at: string;
  metric_value: number;
  threshold_value: number;
  alert_message: string;
  is_read: boolean;
  read_at?: string;
  action_taken?: string;
  confidence_score: number;
  user_feedback_rating?: number;
}

interface AlertPerformance {
  total_alerts: number;
  avg_response_time: number;
  most_active_metric: string;
  accuracy_trend: number;
  recommendations: string[];
}

export const EnhancedMarketAlertSystem = () => {
  const [alertConfigs, setAlertConfigs] = useState<AlertConfiguration[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [performance, setPerformance] = useState<AlertPerformance | null>(null);
  const [newAlert, setNewAlert] = useState<AlertConfiguration>({
    name: '',
    alert_type: 'threshold',
    career_path: '',
    location: '',
    metric_type: 'salary',
    threshold_value: 0,
    comparison_operator: '>',
    time_window: '7d',
    pattern_config: {},
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('configurations');
  const [editingAlert, setEditingAlert] = useState<string | null>(null);

  useEffect(() => {
    loadAlertData();
  }, []);

  const loadAlertData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Load demo data
        loadDemoData();
        return;
      }

      // Load alert configurations
      const { data: configs } = await supabase
        .from('alert_configurations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (configs) {
        setAlertConfigs(configs);
      }

      // Load alert history
      const { data: history } = await supabase
        .from('alert_history')
        .select('*')
        .eq('user_id', user.id)
        .order('triggered_at', { ascending: false })
        .limit(20);

      if (history) {
        setAlertHistory(history);
      }

      // Load performance insights
      await loadPerformanceInsights(user.id);

    } catch (error) {
      console.error('Error loading alert data:', error);
      toast.error('Failed to load alert data');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    // Demo alert configurations
    const demoConfigs: AlertConfiguration[] = [
      {
        id: 'demo_config_1',
        name: 'Software Engineer Salary Alert',
        alert_type: 'threshold',
        career_path: 'Software Engineer',
        location: 'california',
        metric_type: 'salary',
        threshold_value: 120000,
        comparison_operator: '>',
        time_window: '7d',
        pattern_config: {},
        is_active: true
      },
      {
        id: 'demo_config_2',
        name: 'Data Scientist Demand Monitor',
        alert_type: 'threshold',
        career_path: 'Data Scientist',
        location: 'new-york',
        metric_type: 'demand',
        threshold_value: 75,
        comparison_operator: '>=',
        time_window: '30d',
        pattern_config: {},
        is_active: true
      }
    ];

    // Demo alert history
    const demoHistory: AlertHistory[] = [
      {
        id: 'demo_hist_1',
        alert_config_id: 'demo_config_1',
        triggered_at: new Date(Date.now() - 86400000).toISOString(),
        metric_value: 125000,
        threshold_value: 120000,
        alert_message: '↗️ Software Engineer salary in california is now $125,000 (threshold: 120000)',
        is_read: false,
        confidence_score: 0.85
      },
      {
        id: 'demo_hist_2',
        alert_config_id: 'demo_config_2',
        triggered_at: new Date(Date.now() - 172800000).toISOString(),
        metric_value: 78,
        threshold_value: 75,
        alert_message: '↗️ Data Scientist demand score in new-york is now 78.0% (threshold: 75)',
        is_read: true,
        read_at: new Date(Date.now() - 86400000).toISOString(),
        action_taken: 'explored',
        confidence_score: 0.92
      }
    ];

    setAlertConfigs(demoConfigs);
    setAlertHistory(demoHistory);
    setPerformance({
      total_alerts: 12,
      avg_response_time: 4.2,
      most_active_metric: 'salary',
      accuracy_trend: 85.5,
      recommendations: [
        'Your alerts have high accuracy! Consider setting up more specific thresholds.',
        'Response time is good. You might want to enable push notifications for faster alerts.'
      ]
    });
  };

  const loadPerformanceInsights = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('alert-engine', {
        body: { action: 'generate_insights', userId }
      });

      if (error) throw error;
      setPerformance(data.insights);
    } catch (error) {
      console.error('Error loading performance insights:', error);
    }
  };

  const saveAlertConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Demo mode - just add to local state
        const newConfig = { ...newAlert, id: `demo_${Date.now()}` };
        setAlertConfigs(prev => [newConfig, ...prev]);
        toast.success('Demo alert configuration saved!');
        resetNewAlert();
        return;
      }

      const alertData = {
        ...newAlert,
        user_id: user.id
      };

      if (editingAlert) {
        // Update existing alert
        const { error } = await supabase
          .from('alert_configurations')
          .update(alertData)
          .eq('id', editingAlert);

        if (error) throw error;

        setAlertConfigs(prev => 
          prev.map(config => 
            config.id === editingAlert ? { ...alertData, id: editingAlert } : config
          )
        );
        setEditingAlert(null);
        toast.success('Alert configuration updated!');
      } else {
        // Create new alert
        const { data, error } = await supabase
          .from('alert_configurations')
          .insert(alertData)
          .select()
          .single();

        if (error) throw error;

        setAlertConfigs(prev => [data, ...prev]);
        toast.success('Alert configuration saved!');
      }

      resetNewAlert();
    } catch (error) {
      console.error('Error saving alert configuration:', error);
      toast.error('Failed to save alert configuration');
    }
  };

  const deleteAlertConfiguration = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Demo mode
        setAlertConfigs(prev => prev.filter(config => config.id !== id));
        toast.success('Demo alert deleted!');
        return;
      }

      const { error } = await supabase
        .from('alert_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAlertConfigs(prev => prev.filter(config => config.id !== id));
      toast.success('Alert configuration deleted!');
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  const toggleAlertActive = async (id: string, isActive: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Demo mode
        setAlertConfigs(prev => 
          prev.map(config => 
            config.id === id ? { ...config, is_active: isActive } : config
          )
        );
        return;
      }

      const { error } = await supabase
        .from('alert_configurations')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setAlertConfigs(prev => 
        prev.map(config => 
          config.id === id ? { ...config, is_active: isActive } : config
        )
      );
    } catch (error) {
      console.error('Error updating alert status:', error);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Demo mode
        setAlertHistory(prev => 
          prev.map(alert => 
            alert.id === alertId ? { ...alert, is_read: true, read_at: new Date().toISOString() } : alert
          )
        );
        return;
      }

      const { error } = await supabase
        .from('alert_history')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString(),
          action_taken: 'acknowledged'
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlertHistory(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_read: true, read_at: new Date().toISOString() } 
            : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const rateAlert = async (alertId: string, rating: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Demo mode
        setAlertHistory(prev => 
          prev.map(alert => 
            alert.id === alertId ? { ...alert, user_feedback_rating: rating } : alert
          )
        );
        toast.success('Demo feedback recorded!');
        return;
      }

      const { error } = await supabase
        .from('alert_history')
        .update({ user_feedback_rating: rating })
        .eq('id', alertId);

      if (error) throw error;

      setAlertHistory(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, user_feedback_rating: rating } : alert
        )
      );
      
      toast.success('Feedback recorded! This helps improve alert accuracy.');
    } catch (error) {
      console.error('Error rating alert:', error);
    }
  };

  const resetNewAlert = () => {
    setNewAlert({
      name: '',
      alert_type: 'threshold',
      career_path: '',
      location: '',
      metric_type: 'salary',
      threshold_value: 0,
      comparison_operator: '>',
      time_window: '7d',
      pattern_config: {},
      is_active: true
    });
    setEditingAlert(null);
  };

  const startEditingAlert = (config: AlertConfiguration) => {
    setNewAlert(config);
    setEditingAlert(config.id || '');
    setActiveTab('configurations');
  };

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'salary': return <DollarSign className="w-4 h-4" />;
      case 'demand': return <TrendingUp className="w-4 h-4" />;
      case 'growth': return <BarChart3 className="w-4 h-4" />;
      case 'jobs': return <Users className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Enhanced Smart Alert System
          </CardTitle>
          <CardDescription>
            Advanced market monitoring with intelligent pattern recognition and performance tracking
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configurations">Alert Rules</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Alert Configurations Tab */}
        <TabsContent value="configurations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingAlert ? 'Edit Alert Rule' : 'Create New Alert Rule'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="alert-name">Alert Name</Label>
                  <Input
                    id="alert-name"
                    placeholder="e.g., High Salary Alert"
                    value={newAlert.name}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="alert-type">Alert Type</Label>
                  <Select
                    value={newAlert.alert_type}
                    onValueChange={(value) => setNewAlert(prev => ({ ...prev, alert_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="threshold">Threshold Alert</SelectItem>
                      <SelectItem value="pattern">Pattern Detection</SelectItem>
                      <SelectItem value="anomaly">Anomaly Detection</SelectItem>
                      <SelectItem value="predictive">Predictive Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="career-path">Career Path</Label>
                  <Input
                    id="career-path"
                    placeholder="e.g., Software Engineer"
                    value={newAlert.career_path}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, career_path: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., california"
                    value={newAlert.location}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="metric-type">Metric to Monitor</Label>
                  <Select
                    value={newAlert.metric_type}
                    onValueChange={(value) => setNewAlert(prev => ({ ...prev, metric_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary">Average Salary</SelectItem>
                      <SelectItem value="demand">Demand Score</SelectItem>
                      <SelectItem value="growth">Growth Rate</SelectItem>
                      <SelectItem value="jobs">Job Postings Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="comparison">Comparison</Label>
                  <div className="flex gap-2">
                    <Select
                      value={newAlert.comparison_operator}
                      onValueChange={(value) => setNewAlert(prev => ({ ...prev, comparison_operator: value }))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">&gt;</SelectItem>
                        <SelectItem value="<">&lt;</SelectItem>
                        <SelectItem value=">=">&gt;=</SelectItem>
                        <SelectItem value="<=">&lt;=</SelectItem>
                        <SelectItem value="=">=</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Threshold value"
                      value={newAlert.threshold_value}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, threshold_value: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="time-window">Time Window</Label>
                  <Select
                    value={newAlert.time_window}
                    onValueChange={(value) => setNewAlert(prev => ({ ...prev, time_window: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveAlertConfiguration} disabled={!newAlert.name || !newAlert.career_path}>
                  {editingAlert ? 'Update Alert' : 'Create Alert'}
                </Button>
                {editingAlert && (
                  <Button variant="outline" onClick={resetNewAlert}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Existing Alert Configurations */}
          <Card>
            <CardHeader>
              <CardTitle>Active Alert Rules ({alertConfigs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {alertConfigs.length === 0 ? (
                <p className="text-muted-foreground">No alert rules configured yet. Create your first one above!</p>
              ) : (
                <div className="space-y-3">
                  {alertConfigs.map((config) => (
                    <div key={config.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getMetricIcon(config.metric_type)}
                            <span className="font-medium">{config.name}</span>
                          </div>
                          <Badge variant={config.is_active ? "default" : "secondary"}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.is_active}
                            onCheckedChange={(checked) => toggleAlertActive(config.id!, checked)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingAlert(config)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteAlertConfiguration(config.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {config.career_path} in {config.location} • {config.metric_type} {config.comparison_operator} {config.threshold_value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Alert History
                {alertHistory.filter(a => !a.is_read).length > 0 && (
                  <Badge variant="destructive">
                    {alertHistory.filter(a => !a.is_read).length} unread
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertHistory.length === 0 ? (
                <p className="text-muted-foreground">No alerts triggered yet.</p>
              ) : (
                <div className="space-y-3">
                  {alertHistory.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 border rounded-lg ${
                        alert.is_read ? 'bg-muted/50' : 'bg-background border-primary/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Confidence: {(alert.confidence_score * 100).toFixed(0)}%
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(alert.triggered_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{alert.alert_message}</p>
                          
                          {!alert.user_feedback_rating && alert.is_read && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">Rate this alert:</span>
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <Button
                                  key={rating}
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => rateAlert(alert.id, rating)}
                                >
                                  <Star className="w-3 h-3" />
                                </Button>
                              ))}
                            </div>
                          )}
                          
                          {alert.user_feedback_rating && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">Your rating:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <Star
                                    key={rating}
                                    className={`w-3 h-3 ${
                                      rating <= alert.user_feedback_rating! 
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {!alert.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAlertAsRead(alert.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Alerts</span>
                </div>
                <p className="text-2xl font-bold">{performance?.total_alerts || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Avg Response Time</span>
                </div>
                <p className="text-2xl font-bold">{performance?.avg_response_time.toFixed(1) || 0}h</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Most Active Metric</span>
                </div>
                <p className="text-2xl font-bold capitalize">{performance?.most_active_metric || 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                </div>
                <p className="text-2xl font-bold">{performance?.accuracy_trend.toFixed(1) || 0}%</p>
                <Progress value={performance?.accuracy_trend || 0} className="mt-1" />
              </CardContent>
            </Card>
          </div>

          {performance?.recommendations && performance.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Smart Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performance.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive alert notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                </div>
                <Switch />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max-daily">Max Daily Alerts</Label>
                  <Input
                    id="max-daily"
                    type="number"
                    defaultValue="10"
                    min="1"
                    max="50"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Minimum Priority</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button>Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
