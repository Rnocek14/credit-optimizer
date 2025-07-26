import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

interface RealTimeMarketUpdate {
  type: 'trend_update' | 'new_posting' | 'salary_change' | 'demand_shift';
  career_path: string;
  location: string;
  data: any;
  timestamp: string;
  confidence: number;
  source: string;
}

interface MarketSnapshot {
  id: string;
  career_path: string;
  location: string;
  snapshot_data: any;
  created_at: string;
  market_health_score: number;
  trending_up: boolean;
}

interface WebSocketConnection {
  socket: WebSocket | null;
  isConnected: boolean;
  lastHeartbeat: number;
}

export function useRealTimeMarketData() {
  const { state, actions } = useUnifiedData();
  const [realTimeUpdates, setRealTimeUpdates] = useState<RealTimeMarketUpdate[]>([]);
  const [marketSnapshots, setMarketSnapshots] = useState<MarketSnapshot[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  const wsRef = useRef<WebSocketConnection>({ socket: null, isConnected: false, lastHeartbeat: 0 });
  const updateQueueRef = useRef<RealTimeMarketUpdate[]>([]);
  const processingRef = useRef(false);

  // Initialize real-time market data streaming
  const startRealTimeStream = useCallback(async () => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    setConnectionHealth('connecting');
    
    try {
      // Initialize WebSocket connection for real-time updates
      const wsUrl = `wss://vzpissitddpunkpythsb.functions.supabase.co/functions/v1/market-stream`;
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('🌊 Real-time market stream connected');
        setConnectionHealth('connected');
        wsRef.current = { socket, isConnected: true, lastHeartbeat: Date.now() };
        
        // Send initial subscription
        socket.send(JSON.stringify({
          type: 'subscribe',
          career_path: state.selectedCareerPath,
          location: state.selectedLocation,
          features: ['trends', 'postings', 'salary', 'demand']
        }));
      };
      
      socket.onmessage = (event) => {
        try {
          const update: RealTimeMarketUpdate = JSON.parse(event.data);
          
          // Add to queue for processing
          updateQueueRef.current.push(update);
          
          // Process queue if not already processing
          if (!processingRef.current) {
            processUpdateQueue();
          }
        } catch (error) {
          console.error('Error parsing real-time update:', error);
        }
      };
      
      socket.onclose = () => {
        console.log('🔌 Real-time market stream disconnected');
        setConnectionHealth('disconnected');
        wsRef.current = { socket: null, isConnected: false, lastHeartbeat: 0 };
        
        // Attempt reconnection after 5 seconds
        if (isStreaming) {
          setTimeout(() => {
            if (isStreaming) {
              startRealTimeStream();
            }
          }, 5000);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionHealth('disconnected');
      };
      
    } catch (error) {
      console.error('Failed to start real-time stream:', error);
      setConnectionHealth('disconnected');
      setIsStreaming(false);
    }
  }, [isStreaming, state.selectedCareerPath, state.selectedLocation]);

  // Process queued updates
  const processUpdateQueue = useCallback(async () => {
    if (processingRef.current || updateQueueRef.current.length === 0) return;
    
    processingRef.current = true;
    
    try {
      const updates = [...updateQueueRef.current];
      updateQueueRef.current = [];
      
      // Batch process updates
      setRealTimeUpdates(prev => [...prev, ...updates].slice(-50)); // Keep last 50 updates
      
      // Trigger data refresh if significant updates
      const significantUpdates = updates.filter(u => u.confidence > 0.7);
      if (significantUpdates.length > 0) {
        console.log('📈 Significant market updates detected, refreshing data...');
        await actions.refreshAllData();
      }
      
    } catch (error) {
      console.error('Error processing update queue:', error);
    } finally {
      processingRef.current = false;
    }
  }, [actions]);

  // Stop real-time streaming
  const stopRealTimeStream = useCallback(() => {
    setIsStreaming(false);
    setConnectionHealth('disconnected');
    
    if (wsRef.current.socket) {
      wsRef.current.socket.close();
      wsRef.current = { socket: null, isConnected: false, lastHeartbeat: 0 };
    }
  }, []);

  // Fetch market snapshots for historical comparison
  const fetchMarketSnapshots = useCallback(async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('market_trends_history')
        .select('*')
        .eq('career_path', state.selectedCareerPath || '')
        .eq('location', state.selectedLocation || '')
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Transform to market snapshots format
      const snapshots: MarketSnapshot[] = (data || []).map(item => ({
        id: item.id,
        career_path: item.career_path,
        location: item.location,
        snapshot_data: {
          growth_rate: item.growth_rate,
          demand_score: item.demand_score,
          average_salary: item.average_salary,
          job_postings_count: item.job_postings_count,
          ai_insights: item.ai_insights
        },
        created_at: item.recorded_at,
        market_health_score: calculateMarketHealth(item),
        trending_up: item.growth_rate > 0
      }));
      
      setMarketSnapshots(snapshots);
      return snapshots;
    } catch (error) {
      console.error('Error fetching market snapshots:', error);
      return [];
    }
  }, [state.selectedCareerPath, state.selectedLocation]);

  // Calculate market health score from trend data
  const calculateMarketHealth = (trend: any): number => {
    const growthWeight = 0.3;
    const demandWeight = 0.4;
    const salaryWeight = 0.2;
    const competitionWeight = 0.1;
    
    const growthScore = Math.max(0, Math.min(100, (trend.growth_rate + 10) * 5)); // -10 to +20 → 0 to 100
    const demandScore = (trend.demand_score / 10) * 100; // 0 to 10 → 0 to 100
    const salaryScore = Math.min(100, (trend.average_salary / 200000) * 100); // Up to 200k → 0 to 100
    const competitionScore = trend.competition_level === 'low' ? 100 : trend.competition_level === 'medium' ? 50 : 0;
    
    return Math.round(
      growthScore * growthWeight +
      demandScore * demandWeight +
      salaryScore * salaryWeight +
      competitionScore * competitionWeight
    );
  };

  // Get latest market pulse data
  const getMarketPulse = useCallback(() => {
    const recentUpdates = realTimeUpdates.slice(-10);
    const trendingUp = recentUpdates.filter(u => u.type === 'trend_update' && u.data?.direction === 'up').length;
    const trendingDown = recentUpdates.filter(u => u.type === 'trend_update' && u.data?.direction === 'down').length;
    
    return {
      updates: recentUpdates,
      momentum: trendingUp > trendingDown ? 'bullish' : trendingDown > trendingUp ? 'bearish' : 'neutral',
      activity_level: recentUpdates.length > 5 ? 'high' : recentUpdates.length > 2 ? 'medium' : 'low',
      last_update: recentUpdates[0]?.timestamp || null
    };
  }, [realTimeUpdates]);

  // Auto-start streaming when career path or location changes
  useEffect(() => {
    if (state.selectedCareerPath && state.selectedLocation) {
      startRealTimeStream();
      fetchMarketSnapshots();
    }
    
    return () => {
      stopRealTimeStream();
    };
  }, [state.selectedCareerPath, state.selectedLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealTimeStream();
    };
  }, []);

  return {
    // Real-time data
    realTimeUpdates,
    marketSnapshots,
    isStreaming,
    connectionHealth,
    
    // Market pulse
    marketPulse: getMarketPulse(),
    
    // Controls
    startRealTimeStream,
    stopRealTimeStream,
    fetchMarketSnapshots,
    
    // Health check
    isConnected: connectionHealth === 'connected',
    lastUpdate: realTimeUpdates[0]?.timestamp || null
  };
}