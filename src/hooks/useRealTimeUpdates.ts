import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  user_id?: string;
  timestamp: string;
  metadata?: any;
}

interface RealTimeState {
  systemMetrics: SystemMetric[];
  activityLogs: ActivityLog[];
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function useRealTimeUpdates() {
  const { toast } = useToast();
  const [state, setState] = useState<RealTimeState>({
    systemMetrics: [],
    activityLogs: [],
    isConnected: false,
    lastUpdate: null
  });
  
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default

  // Mock system metrics for demo
  const generateMockMetrics = useCallback((): SystemMetric[] => {
    const now = new Date().toISOString();
    return [
      {
        id: '1',
        metric_name: 'System Health',
        metric_value: Math.random() * 20 + 80, // 80-100%
        status: 'healthy',
        timestamp: now
      },
      {
        id: '2',
        metric_name: 'Active Workflows',
        metric_value: Math.floor(Math.random() * 5) + 15, // 15-20
        status: 'healthy',
        timestamp: now
      },
      {
        id: '3',
        metric_name: 'Response Time',
        metric_value: Math.random() * 100 + 50, // 50-150ms
        status: Math.random() > 0.8 ? 'warning' : 'healthy',
        timestamp: now
      },
      {
        id: '4',
        metric_name: 'API Success Rate',
        metric_value: Math.random() * 5 + 95, // 95-100%
        status: 'healthy',
        timestamp: now
      }
    ];
  }, []);

  // Mock activity logs for demo
  const generateMockActivity = useCallback((): ActivityLog => {
    const activities = [
      'Workflow Created',
      'Market Alert Generated',
      'Skill Analysis Completed',
      'User Feedback Received',
      'System Health Check',
      'Data Backup Completed'
    ];
    
    const descriptions = [
      'New Data Scientist career path workflow initiated',
      'Python demand spike detected in San Francisco',
      'Skill gap analysis completed for machine learning',
      'User provided 5-star feedback on workflow',
      'All systems operating within normal parameters',
      'Daily data backup completed successfully'
    ];
    
    const randomIndex = Math.floor(Math.random() * activities.length);
    
    return {
      id: Date.now().toString() + Math.random(),
      activity_type: activities[randomIndex],
      description: descriptions[randomIndex],
      user_id: '2b458624-d498-4cca-a63d-9341cc20e363',
      timestamp: new Date().toISOString(),
      metadata: { source: 'maya_ai', priority: 'normal' }
    };
  }, []);

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    try {
      console.log('🔄 Fetching real-time updates...');
      
      // In production, these would be real database queries
      // For now, using mock data that simulates real-time changes
      const metrics = generateMockMetrics();
      const newActivity = generateMockActivity();
      
      setState(prev => ({
        ...prev,
        systemMetrics: metrics,
        activityLogs: [newActivity, ...prev.activityLogs.slice(0, 19)], // Keep last 20
        isConnected: true,
        lastUpdate: new Date()
      }));
      
      console.log('✅ Real-time data updated');
      
    } catch (error) {
      console.error('❌ Real-time update error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, [generateMockMetrics, generateMockActivity]);

  // Set up real-time subscriptions
  useEffect(() => {
    console.log('🌐 Setting up real-time connections...');
    
    // Initial data fetch
    fetchRealTimeData();
    
    // Set up periodic updates
    const interval = setInterval(fetchRealTimeData, refreshInterval);
    
    // In production, set up Supabase real-time subscriptions:
    // const channel = supabase
    //   .channel('maya-realtime')
    //   .on('postgres_changes', {
    //     event: '*',
    //     schema: 'public',
    //     table: 'system_metrics'
    //   }, (payload) => {
    //     console.log('Real-time metric update:', payload);
    //     // Handle real-time updates
    //   })
    //   .subscribe();
    
    return () => {
      clearInterval(interval);
      // supabase.removeChannel(channel);
    };
  }, [fetchRealTimeData, refreshInterval]);

  // System alert detection
  useEffect(() => {
    const criticalMetrics = state.systemMetrics.filter(m => m.status === 'critical');
    const warningMetrics = state.systemMetrics.filter(m => m.status === 'warning');
    
    if (criticalMetrics.length > 0) {
      toast({
        title: "Critical System Alert",
        description: `${criticalMetrics.length} critical issues detected`,
        variant: "destructive"
      });
    } else if (warningMetrics.length > 0) {
      toast({
        title: "System Warning",
        description: `${warningMetrics.length} warnings detected`,
      });
    }
  }, [state.systemMetrics, toast]);

  const updateRefreshInterval = useCallback((interval: number) => {
    setRefreshInterval(interval);
    toast({
      title: "Refresh Rate Updated",
      description: `Updates every ${interval / 1000} seconds`,
    });
  }, [toast]);

  const forceRefresh = useCallback(() => {
    fetchRealTimeData();
    toast({
      title: "Data Refreshed",
      description: "Real-time data has been updated",
    });
  }, [fetchRealTimeData, toast]);

  return {
    ...state,
    refreshInterval,
    updateRefreshInterval,
    forceRefresh,
    fetchRealTimeData
  };
}