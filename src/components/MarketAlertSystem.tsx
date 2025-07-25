import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MarketAlert {
  id: string;
  alert_type: string;
  career_path: string;
  location: string;
  threshold_value: number;
  current_value: number;
  alert_message: string;
  is_read: boolean;
  triggered_at: string;
}

interface UserPreferences {
  id?: string;
  preferred_careers: string[];
  preferred_locations: string[];
  salary_range_min: number;
  salary_range_max: number;
  alert_enabled: boolean;
  alert_frequency: string;
}

export const MarketAlertSystem = () => {
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    preferred_careers: [],
    preferred_locations: [],
    salary_range_min: 50000,
    salary_range_max: 200000,
    alert_enabled: false,
    alert_frequency: 'weekly'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load user preferences and alerts
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load preferences
      const { data: prefsData } = await supabase
        .from('user_market_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefsData) {
        setPreferences({
          id: prefsData.id,
          preferred_careers: prefsData.preferred_careers || [],
          preferred_locations: prefsData.preferred_locations || [],
          salary_range_min: prefsData.salary_range_min || 50000,
          salary_range_max: prefsData.salary_range_max || 200000,
          alert_enabled: prefsData.alert_enabled || false,
          alert_frequency: prefsData.alert_frequency || 'weekly'
        });
      }

      // Load alerts
      const { data: alertsData } = await supabase
        .from('market_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('triggered_at', { ascending: false })
        .limit(10);

      if (alertsData) {
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load alert preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to save preferences');
        return;
      }

      const prefsData = {
        user_id: user.id,
        preferred_careers: preferences.preferred_careers,
        preferred_locations: preferences.preferred_locations,
        salary_range_min: preferences.salary_range_min,
        salary_range_max: preferences.salary_range_max,
        alert_enabled: preferences.alert_enabled,
        alert_frequency: preferences.alert_frequency
      };

      if (preferences.id) {
        // Update existing preferences
        await supabase
          .from('user_market_preferences')
          .update(prefsData)
          .eq('id', preferences.id);
      } else {
        // Create new preferences
        const { data } = await supabase
          .from('user_market_preferences')
          .insert(prefsData)
          .select()
          .single();
        
        if (data) {
          setPreferences(prev => ({ ...prev, id: data.id }));
        }
      }

      toast.success('Alert preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      await supabase
        .from('market_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'salary_change':
        return <DollarSign className="w-4 h-4" />;
      case 'demand_shift':
        return <TrendingUp className="w-4 h-4" />;
      case 'new_opportunities':
        return <Users className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'salary_change':
        return 'text-green-600';
      case 'demand_shift':
        return 'text-blue-600';
      case 'new_opportunities':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alert Preferences
          </CardTitle>
          <CardDescription>
            Configure when and how you receive market intelligence alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="alert-enabled">Enable Market Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications about significant market changes
              </p>
            </div>
            <Switch
              id="alert-enabled"
              checked={preferences.alert_enabled}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, alert_enabled: checked }))
              }
            />
          </div>

          {preferences.alert_enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Alert Frequency</Label>
                  <Select
                    value={preferences.alert_frequency}
                    onValueChange={(value) =>
                      setPreferences(prev => ({ ...prev, alert_frequency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Salary Range of Interest</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={preferences.salary_range_min}
                      onChange={(e) =>
                        setPreferences(prev => ({
                          ...prev,
                          salary_range_min: parseInt(e.target.value) || 0
                        }))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={preferences.salary_range_max}
                      onChange={(e) =>
                        setPreferences(prev => ({
                          ...prev,
                          salary_range_max: parseInt(e.target.value) || 0
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Preferred Career Paths (comma-separated)</Label>
                <Input
                  placeholder="Software Engineer, Data Scientist, Product Manager"
                  value={preferences.preferred_careers.join(', ')}
                  onChange={(e) =>
                    setPreferences(prev => ({
                      ...prev,
                      preferred_careers: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))
                  }
                />
              </div>

              <div>
                <Label>Preferred Locations (comma-separated)</Label>
                <Input
                  placeholder="california, new-york, texas, remote"
                  value={preferences.preferred_locations.join(', ')}
                  onChange={(e) =>
                    setPreferences(prev => ({
                      ...prev,
                      preferred_locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))
                  }
                />
              </div>
            </>
          )}

          <Button onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recent Alerts
            {alerts.filter(a => !a.is_read).length > 0 && (
              <Badge variant="destructive">
                {alerts.filter(a => !a.is_read).length} new
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Stay informed about market changes in your areas of interest
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-muted-foreground">
              No alerts yet. Enable alerts above to start receiving market intelligence notifications.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.is_read ? 'bg-muted/50' : 'bg-background border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${getAlertColor(alert.alert_type)}`}>
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {alert.alert_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {alert.career_path} • {alert.location}
                          </span>
                        </div>
                        <p className="text-sm">{alert.alert_message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.triggered_at).toLocaleDateString()}
                        </p>
                      </div>
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
    </div>
  );
};