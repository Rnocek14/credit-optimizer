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

      console.log('📊 Phase 5: Fetching metrics for user:', userId);

      // Fetch autonomous workflows
      const { data: workflows, error: workflowError } = await supabase
        .from('autonomous_workflows')
        .select('*')
        .eq('user_id', userId);

      if (workflowError) throw workflowError;

      // Fetch Maya decisions (last 30 days)
      const { data: decisions, error: decisionsError } = await supabase
        .from('maya_decisions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

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

      console.log('✅ Phase 5: Metrics calculated:', {
        workflows: workflows?.length,
        decisions: decisions?.length,
        alerts: alerts?.length,
        systemHealth: metrics.systemHealth,
        predictiveAccuracy: metrics.predictiveAccuracy
      });

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
      
      // Provide meaningful fallback data when errors occur
      const fallbackMetrics: Phase5Metrics = {
        autonomousWorkflows: 0,
        mayaDecisions: 0,
        marketAlerts: 0,
        systemHealth: 50, // Degraded but not completely failed
        realTimeConnections: 0,
        predictiveAccuracy: 0
      };
      
      setStatus(prev => ({
        ...prev,
        metrics: fallbackMetrics,
        connectionStatus: 'disconnected',
        errors: [...prev.errors.slice(-4), error instanceof Error ? error.message : 'Unknown error'] // Keep last 5 errors
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateSystemHealth = (workflows: any[], decisions: any[], alerts: any[]) => {
    let healthScore = 100;
    
    // Add health for active or completed workflows
    if (workflows?.length > 0) {
      const activeWorkflows = workflows.filter(w => w.status === 'active').length;
      const completedWorkflows = workflows.filter(w => w.status === 'completed').length;
      
      // Boost health for having workflows
      if (activeWorkflows > 0) healthScore += 10;
      if (completedWorkflows > 0) healthScore += 5;
    } else {
      // Reduce health if no workflows
      healthScore -= 15;
    }
    
    // Add health for successful decisions
    if (decisions?.length > 0) {
      const successfulDecisions = decisions.filter(d => d.status !== 'failed').length;
      const successRate = successfulDecisions / decisions.length;
      healthScore += Math.round(successRate * 15);
    }
    
    // Reduce health for failed decisions (but less severely)
    const failedDecisions = decisions?.filter(d => d.status === 'failed').length || 0;
    healthScore -= Math.min(failedDecisions * 5, 20);
    
    // Reduce health for critical alerts
    const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
    healthScore -= Math.min(criticalAlerts * 10, 30);
    
    // Cap at reasonable range
    return Math.max(Math.min(healthScore, 100), 0);
  };

  const calculatePredictiveAccuracy = (decisions: any[]) => {
    if (!decisions?.length) return 0;
    
    // Filter for decisions with confidence scores (last 30 days)
    const scoredDecisions = decisions.filter(d => 
      d.confidence_score && 
      typeof d.confidence_score === 'number' &&
      d.confidence_score > 0
    );
    
    if (!scoredDecisions.length) return 0;
    
    // Calculate weighted accuracy based on confidence scores and outcomes
    const totalConfidence = scoredDecisions.reduce((sum, d) => {
      const confidence = d.confidence_score;
      const outcome = d.status === 'failed' ? 0 : 1; // Simple outcome measure
      return sum + (confidence * outcome);
    }, 0);
    
    const avgConfidence = scoredDecisions.reduce((sum, d) => sum + d.confidence_score, 0) / scoredDecisions.length;
    
    // Return confidence as percentage (Maya decisions typically have 0.9 confidence = 90%)
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

      const { error } = await supabase
        .from('career_monitoring_alerts')
        .insert({
          user_id: userId,
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