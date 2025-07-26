import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamSubscription {
  career_path: string;
  location: string;
  features: string[];
}

interface MarketUpdate {
  type: 'trend_update' | 'new_posting' | 'salary_change' | 'demand_shift';
  career_path: string;
  location: string;
  data: any;
  timestamp: string;
  confidence: number;
  source: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders
    });
  }

  console.log('🌊 New WebSocket connection request');

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let subscription: StreamSubscription | null = null;
  let heartbeatInterval: number | null = null;
  let updateInterval: number | null = null;

  socket.onopen = () => {
    console.log('✅ WebSocket connection established');
    
    // Start heartbeat
    heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Every 30 seconds
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('📨 Received message:', message);

      if (message.type === 'subscribe') {
        subscription = {
          career_path: message.career_path,
          location: message.location,
          features: message.features || ['trends', 'postings', 'salary', 'demand']
        };

        console.log('📡 Subscription established:', subscription);

        // Send confirmation
        socket.send(JSON.stringify({
          type: 'subscription_confirmed',
          subscription,
          timestamp: new Date().toISOString()
        }));

        // Start sending mock updates
        startMarketUpdates();
      } else if (message.type === 'unsubscribe') {
        subscription = null;
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
        
        socket.send(JSON.stringify({
          type: 'unsubscribed',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onclose = () => {
    console.log('🔌 WebSocket connection closed');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (updateInterval) clearInterval(updateInterval);
  };

  socket.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };

  // Generate mock market updates
  function startMarketUpdates() {
    if (!subscription || updateInterval) return;

    updateInterval = setInterval(() => {
      if (!subscription || socket.readyState !== WebSocket.OPEN) return;

      // Generate random market update
      const updateTypes: MarketUpdate['type'][] = ['trend_update', 'new_posting', 'salary_change', 'demand_shift'];
      const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
      
      const update: MarketUpdate = {
        type: randomType,
        career_path: subscription.career_path,
        location: subscription.location,
        data: generateUpdateData(randomType),
        timestamp: new Date().toISOString(),
        confidence: 0.6 + Math.random() * 0.4, // 60-100% confidence
        source: 'market_aggregator'
      };

      console.log('📈 Sending market update:', update.type);
      socket.send(JSON.stringify(update));
    }, 5000 + Math.random() * 10000); // Every 5-15 seconds
  }

  function generateUpdateData(type: MarketUpdate['type']) {
    switch (type) {
      case 'trend_update':
        return {
          direction: Math.random() > 0.5 ? 'up' : 'down',
          magnitude: (Math.random() * 10).toFixed(1),
          timeframe: '24h'
        };
      
      case 'new_posting':
        return {
          count: Math.floor(Math.random() * 50) + 1,
          companies: ['TechCorp', 'InnovateLabs', 'DataDriven Inc.'],
          avg_salary: Math.floor(Math.random() * 50000) + 80000
        };
      
      case 'salary_change':
        return {
          change_percent: (Math.random() * 10 - 5).toFixed(1), // -5% to +5%
          new_average: Math.floor(Math.random() * 50000) + 80000,
          sample_size: Math.floor(Math.random() * 100) + 50
        };
      
      case 'demand_shift':
        return {
          old_score: (Math.random() * 10).toFixed(1),
          new_score: (Math.random() * 10).toFixed(1),
          drivers: ['remote work trends', 'industry growth', 'skill demand'],
          impact: Math.random() > 0.5 ? 'positive' : 'negative'
        };
      
      default:
        return {};
    }
  }

  return response;
});