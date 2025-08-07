import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { getCurrentDevUser } from '@/lib/devUserSetup';

interface Phase5Metrics {
  autonomousWorkflows: number;
  mayaDecisions: number;
  marketAlerts: number;
  systemHealth: number;
  realTimeConnections: number;
  predictiveAccuracy: number;
}

interface Phase5Status {
  isInitialized: boolean;
  metrics: Phase5Metrics;
  lastUpdate: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  errors: string[];
}

export function useEnhancedPhase5() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Phase5Status>({
    isInitialized: false,
    metrics: {
      autonomousWorkflows: 0,
      mayaDecisions: 0,
      marketAlerts: 0,
      systemHealth: 0,
      realTimeConnections: 0,
      predictiveAccuracy: 0
    },
    lastUpdate: null,
    connectionStatus: 'disconnected',
    errors: []
  });

  const [loading, setLoading] = useState(true);

  const fetchPhase5Metrics = useCallback(async () => {
    try {
      let userId: string;
      
      // Try Supabase auth first
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        userId = user.user.id;
      } else {
        // Fallback to dev user session
        const devUser = getCurrentDevUser();
        if (!devUser) throw new Error('User not authenticated');
        userId = devUser.id;
      }

      // Fetch autonomous workflows
      const { data: workflows, error: workflowError } = await supabase
        .from('autonomous_workflows')
        .select('*')
        .eq('user_id', userId);

      if (workflowError) throw workflowError;

      // Fetch Maya decisions
      const { data: decisions, error: decisionsError } = await supabase
        .from('maya_decisions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch market alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('career_monitoring_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      // Calculate metrics
      const metrics: Phase5Metrics = {
        autonomousWorkflows: workflows?.length || 0,
        mayaDecisions: decisions?.length || 0,
        marketAlerts: alerts?.length || 0,
        systemHealth: calculateSystemHealth(workflows, decisions, alerts),
        realTimeConnections: 1, // Simulated
        predictiveAccuracy: calculatePredictiveAccuracy(decisions || [])
      };

      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        metrics,
        lastUpdate: new Date(),
        connectionStatus: 'connected',
        errors: []
      }));

    } catch (error) {
      console.error('Phase 5 metrics fetch error:', error);
      setStatus(prev => ({
        ...prev,
        connectionStatus: 'disconnected',
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateSystemHealth = (workflows: any[], decisions: any[], alerts: any[]) => {
    let healthScore = 100;
    
    // Reduce health if no active workflows
    if (!workflows?.some(w => w.status === 'active')) {
      healthScore -= 20;
    }
    
    // Reduce health if too many failed decisions
    const failedDecisions = decisions?.filter(d => d.status === 'failed').length || 0;
    healthScore -= Math.min(failedDecisions * 10, 30);
    
    // Reduce health if too many critical alerts
    const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
    healthScore -= Math.min(criticalAlerts * 15, 40);
    
    return Math.max(healthScore, 0);
  };

  const calculatePredictiveAccuracy = (decisions: any[]) => {
    if (!decisions?.length) return 0;
    
    const scoredDecisions = decisions.filter(d => d.confidence_score);
    if (!scoredDecisions.length) return 0;
    
    const avgConfidence = scoredDecisions.reduce((sum, d) => sum + d.confidence_score, 0) / scoredDecisions.length;
    return Math.round(avgConfidence * 100);
  };

  const initializePhase5 = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, connectionStatus: 'reconnecting' }));
      
      // Initialize real-time subscriptions
      const channel = supabase
        .channel('phase5-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'autonomous_workflows'
        }, () => {
          fetchPhase5Metrics();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'maya_decisions'
        }, () => {
          fetchPhase5Metrics();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'career_monitoring_alerts'
        }, () => {
          fetchPhase5Metrics();
        })
        .subscribe();

      await fetchPhase5Metrics();
      
      toast({
        title: "Phase 5 Initialized",
        description: "Enhanced AI systems are now active",
      });

      return () => {
        channel.unsubscribe();
      };
    } catch (error) {
      console.error('Phase 5 initialization error:', error);
      toast({
        title: "Phase 5 Initialization Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [fetchPhase5Metrics, toast]);

  const triggerMayaDecision = useCallback(async (context: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-maya-response', {
        body: {
          request: 'generate_autonomous_decision',
          context
        }
      });

      if (error) throw error;

      toast({
        title: "Maya Decision Generated",
        description: "New autonomous decision created",
      });

      await fetchPhase5Metrics();
      return data;
    } catch (error) {
      console.error('Maya decision error:', error);
      toast({
        title: "Decision Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [fetchPhase5Metrics, toast]);

  const createMarketAlert = useCallback(async (alertData: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('career_monitoring_alerts')
        .insert({
          user_id: user.user.id,
          ...alertData
        });

      if (error) throw error;

      toast({
        title: "Market Alert Created",
        description: alertData.title,
      });

      await fetchPhase5Metrics();
    } catch (error) {
      console.error('Market alert creation error:', error);
      toast({
        title: "Alert Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [fetchPhase5Metrics, toast]);

  // Initialize on mount
  useEffect(() => {
    initializePhase5();
  }, [initializePhase5]);

  // Periodic health checks
  useEffect(() => {
    const interval = setInterval(fetchPhase5Metrics, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPhase5Metrics]);

  return {
    status,
    loading,
    fetchPhase5Metrics,
    initializePhase5,
    triggerMayaDecision,
    createMarketAlert
  };
}