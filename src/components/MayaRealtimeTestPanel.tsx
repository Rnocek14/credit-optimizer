import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRealtimeMayaData } from '@/hooks/useRealtimeMayaData';
import { Wifi, WifiOff, TestTube, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function MayaRealtimeTestPanel() {
  const { data, isConnected, broadcastTestDecision, fetchInitialData } = useRealtimeMayaData();
  const [isTesting, setIsTesting] = useState(false);

  const handleBroadcastTest = async () => {
    setIsTesting(true);
    try {
      await broadcastTestDecision();
      console.log('✅ Test broadcast sent successfully');
    } catch (error) {
      console.error('❌ Test broadcast failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      await fetchInitialData();
      console.log('✅ Data refresh completed');
    } catch (error) {
      console.error('❌ Data refresh failed:', error);
    }
  };

  return (
    <Card className="border-2 border-dashed border-muted-foreground/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Real-time Connection Test
          <Badge variant={isConnected ? "default" : "destructive"} className="ml-auto"
                style={isConnected ? { backgroundColor: 'hsl(var(--success))', color: 'hsl(var(--success-foreground))' } : undefined}>
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Insights:</span> {data.insights.length}
          </div>
          <div>
            <span className="font-medium">Decisions:</span> {data.decisions.length}
          </div>
          <div>
            <span className="font-medium">Optimizations:</span> {data.optimizations.length}
          </div>
          <div>
            <span className="font-medium">Thought Process:</span> {data.thoughtProcess.length}
          </div>
        </div>

        {data.lastUpdate && (
          <div className="text-xs text-muted-foreground">
            Last Update: {data.lastUpdate.toLocaleTimeString()}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleBroadcastTest}
            disabled={isTesting}
            size="sm"
            variant="outline"
          >
            <Send className="h-4 w-4 mr-2" />
            {isTesting ? 'Broadcasting...' : 'Test Broadcast'}
          </Button>
          
          <Button 
            onClick={handleRefreshData}
            size="sm"
            variant="outline"
          >
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}