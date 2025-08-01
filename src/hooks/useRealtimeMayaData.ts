import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

interface MayaRealtimeData {
  insights: any[];
  decisions: any[];
  optimizations: any[];
  thoughtProcess: any[];
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function useRealtimeMayaData() {
  const { state } = useUnifiedData();
  const [data, setData] = useState<MayaRealtimeData>({
    insights: [],
    decisions: [],
    optimizations: [],
    thoughtProcess: [],
    isConnected: false,
    lastUpdate: null
  });
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription to Maya decision logs
  const connectToRealtimeData = useCallback(() => {
    console.log('🔌 Connecting to Maya real-time data...');
    
    // Setup real-time subscriptions to Maya-related tables
    const channel = supabase
      .channel('maya-automation')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'career_monitoring_alerts'
      }, (payload) => {
        console.log('🚨 New Maya alert:', payload);
        setData(prev => ({
          ...prev,
          decisions: [payload.new, ...prev.decisions.slice(0, 4)],
          lastUpdate: new Date()
        }));
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'autonomous_workflows'
      }, (payload) => {
        console.log('🔄 New workflow:', payload);
        setData(prev => ({
          ...prev,
          insights: [payload.new, ...prev.insights.slice(0, 4)],
          lastUpdate: new Date()
        }));
      })
      .on('broadcast', { event: 'decision' }, (payload) => {
        console.log('🧠 New Maya decision:', payload);
        setData(prev => ({
          ...prev,
          thoughtProcess: [payload.decision, ...prev.thoughtProcess.slice(0, 9)],
          lastUpdate: new Date()
        }));
      })
      .on('broadcast', { event: 'insight' }, (payload) => {
        console.log('💡 New Maya insight:', payload);
        setData(prev => ({
          ...prev,
          insights: [payload.insight, ...prev.insights.slice(0, 4)],
          lastUpdate: new Date()
        }));
      })
      .subscribe((status) => {
        console.log('📡 Maya realtime status:', status);
        setData(prev => ({ ...prev, isConnected: status === 'SUBSCRIBED' }));
      });

    return () => {
      console.log('🔌 Disconnecting from Maya real-time data');
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch initial data from real Supabase tables
  const fetchInitialData = useCallback(async () => {
    try {
      console.log('📊 Fetching initial Maya data...');
      setError(null);
      
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id || state.user?.id;
      
      if (!userId) {
        console.warn('No user ID available, using mock data');
        throw new Error('No user authenticated');
      }

      // Get real insights from autonomous workflows
      const { data: workflows } = await supabase
        .from('autonomous_workflows')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('last_action_at', { ascending: false })
        .limit(5);

      // Get real alerts/decisions
      const { data: alerts } = await supabase
        .from('career_monitoring_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      // Transform real data
      const realData = {
        insights: workflows?.map(w => ({
          id: w.id,
          type: 'workflow_insight',
          title: `${w.title} Progress`,
          confidence: w.progress_percentage / 100,
          timestamp: new Date(w.last_action_at)
        })) || [],
        decisions: alerts?.map(a => ({
          id: a.id,
          title: a.title,
          urgency: a.severity,
          confidence: 0.85,
          timestamp: new Date(a.created_at)
        })) || [],
        optimizations: []
      };

      if (workflows?.length || alerts?.length) {
        setData(prev => ({
          ...prev,
          ...realData,
          lastUpdate: new Date()
        }));
        console.log('✅ Real Maya data loaded');
        return;
      }

      // Fallback to mock data if no real data
      const mockData = {
        insights: [
          {
            id: 'insight-1',
            type: 'market_trend',
            title: 'React Developer Demand Surge',
            confidence: 0.89,
            timestamp: new Date()
          }
        ],
        decisions: [
          {
            id: 'decision-1',
            title: 'Optimize Learning Path Priority',
            urgency: 'medium',
            confidence: 0.92,
            timestamp: new Date()
          }
        ],
        optimizations: [
          {
            id: 'opt-1',
            title: 'Adaptive Session Length',
            type: 'engagement',
            expectedImprovement: { completionRate: 15, retentionRate: 12 },
            timestamp: new Date()
          }
        ]
      };
      
      setData(prev => ({
        ...prev,
        ...mockData,
        lastUpdate: new Date()
      }));
      
      console.log('✅ Mock Maya data loaded as fallback');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load Maya data';
      console.error('❌ Maya data error:', err);
      setError(errorMsg);
    }
  }, [state.user]);

  // Initialize and cleanup
  useEffect(() => {
    fetchInitialData();
    const cleanup = connectToRealtimeData();
    return cleanup;
  }, [fetchInitialData, connectToRealtimeData]);

  // Broadcast test decision (for demonstration)
  const broadcastTestDecision = useCallback(async () => {
    const testDecision = {
      id: `test-${Date.now()}`,
      action: 'Test automation decision',
      reasoning: 'Demonstrating real-time Maya intelligence',
      confidence: 0.95,
      outcome: 'Updated dashboard in real-time',
      category: 'test',
      timestamp: new Date()
    };

    await supabase.channel('maya-automation').send({
      type: 'broadcast',
      event: 'decision',
      decision: testDecision
    });
  }, []);

  return {
    data,
    error,
    fetchInitialData,
    broadcastTestDecision,
    isConnected: data.isConnected,
    lastUpdate: data.lastUpdate
  };
}