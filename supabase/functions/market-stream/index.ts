import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketStreamMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  career_path?: string;
  location?: string;
  features?: string[];
}

interface RealTimeMarketUpdate {
  type: 'trend_update' | 'new_posting' | 'salary_change' | 'demand_shift';
  career_path: string;
  location: string;
  data: any;
  timestamp: string;
  confidence: number;
  source: string;
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  let subscriptions: Set<string> = new Set();
  let heartbeatInterval: number | null = null;

  socket.onopen = () => {
    console.log('🌊 Market stream WebSocket connected');
    
    // Start heartbeat
    heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // 30 second heartbeat

    // Send initial connection confirmation
    socket.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      status: 'connected'
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message: MarketStreamMessage = JSON.parse(event.data);
      console.log('📨 Received message:', message);

      switch (message.type) {
        case 'subscribe':
          if (message.career_path && message.location) {
            const subscription = `${message.career_path}:${message.location}`;
            subscriptions.add(subscription);
            
            console.log(`✅ Subscribed to: ${subscription}`);
            
            // Send confirmation
            socket.send(JSON.stringify({
              type: 'subscription_confirmed',
              career_path: message.career_path,
              location: message.location,
              features: message.features || [],
              timestamp: new Date().toISOString()
            }));

            // Start sending simulated market updates
            startMarketUpdates(socket, message.career_path, message.location);
          }
          break;

        case 'unsubscribe':
          if (message.career_path && message.location) {
            const subscription = `${message.career_path}:${message.location}`;
            subscriptions.delete(subscription);
            console.log(`❌ Unsubscribed from: ${subscription}`);
          }
          break;

        case 'ping':
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message',
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onclose = () => {
    console.log('🔌 Market stream WebSocket disconnected');
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  };

  socket.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };

  return response;
});

function startMarketUpdates(socket: WebSocket, careerPath: string, location: string) {
  // Send initial market update
  setTimeout(() => {
    if (socket.readyState === WebSocket.OPEN) {
      const update: RealTimeMarketUpdate = {
        type: 'trend_update',
        career_path: careerPath,
        location: location,
        data: {
          direction: 'up',
          change_percentage: Math.random() * 5 + 1, // 1-6% change
          metric: 'demand_score'
        },
        timestamp: new Date().toISOString(),
        confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
        source: 'market_analyzer'
      };

      socket.send(JSON.stringify(update));
      console.log('📈 Sent market update:', update);
    }
  }, 2000);

  // Send periodic updates
  const updateInterval = setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) {
      clearInterval(updateInterval);
      return;
    }

    // Random update type
    const updateTypes: RealTimeMarketUpdate['type'][] = [
      'trend_update', 
      'new_posting', 
      'salary_change', 
      'demand_shift'
    ];
    
    const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
    
    const update: RealTimeMarketUpdate = {
      type: randomType,
      career_path: careerPath,
      location: location,
      data: generateUpdateData(randomType),
      timestamp: new Date().toISOString(),
      confidence: 0.7 + Math.random() * 0.3, // 70-100% confidence
      source: getSourceForUpdateType(randomType)
    };

    socket.send(JSON.stringify(update));
    console.log(`📊 Sent ${randomType} update:`, update);
    
  }, 15000 + Math.random() * 30000); // 15-45 seconds between updates

  // Cleanup interval when socket closes
  socket.addEventListener('close', () => {
    clearInterval(updateInterval);
  });
}

function generateUpdateData(updateType: RealTimeMarketUpdate['type']) {
  switch (updateType) {
    case 'trend_update':
      return {
        direction: Math.random() > 0.6 ? 'up' : 'down',
        change_percentage: Math.random() * 8 + 1,
        metric: ['demand_score', 'growth_rate', 'market_health'][Math.floor(Math.random() * 3)]
      };
    
    case 'new_posting':
      return {
        count: Math.floor(Math.random() * 20) + 5,
        companies: ['TechCorp', 'Innovation Ltd', 'StartupX', 'MegaCorp'][Math.floor(Math.random() * 4)],
        avg_salary_range: {
          min: 80000 + Math.random() * 40000,
          max: 120000 + Math.random() * 80000
        }
      };
    
    case 'salary_change':
      return {
        direction: Math.random() > 0.3 ? 'up' : 'down',
        change_amount: Math.floor(Math.random() * 15000) + 2000,
        sample_size: Math.floor(Math.random() * 100) + 50
      };
    
    case 'demand_shift':
      return {
        shift_direction: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
        impact_score: Math.random() * 10,
        contributing_factors: ['market_expansion', 'technology_adoption', 'economic_growth']
      };
    
    default:
      return {};
  }
}

function getSourceForUpdateType(updateType: RealTimeMarketUpdate['type']): string {
  switch (updateType) {
    case 'trend_update':
      return 'trend_analyzer';
    case 'new_posting':
      return 'job_aggregator';
    case 'salary_change':
      return 'salary_tracker';
    case 'demand_shift':
      return 'demand_forecaster';
    default:
      return 'market_stream';
  }
}