import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, Zap } from 'lucide-react';
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData';
import { cn } from '@/lib/utils';

interface RealTimeMarketPulseProps {
  className?: string;
  compact?: boolean;
}

export const RealTimeMarketPulse = memo<RealTimeMarketPulseProps>(({
  className,
  compact = false
}) => {
  console.log('🔍 RealTimeMarketPulse: Component loading...');
  
  const {
    realTimeUpdates,
    isStreaming,
    connectionHealth,
    marketPulse,
    startRealTimeStream,
    stopRealTimeStream,
    isConnected,
    lastUpdate
  } = useRealTimeMarketData();

  // Memoized pulse indicators
  const pulseIndicators = useMemo(() => {
    const momentum = marketPulse.momentum;
    const activity = marketPulse.activity_level;
    
    return {
      momentum: {
        icon: momentum === 'bullish' ? TrendingUp : momentum === 'bearish' ? TrendingDown : Activity,
        color: momentum === 'bullish' ? 'text-green-500' : momentum === 'bearish' ? 'text-red-500' : 'text-blue-500',
        label: momentum === 'bullish' ? 'Bullish' : momentum === 'bearish' ? 'Bearish' : 'Neutral',
        description: momentum === 'bullish' ? 'Market trending upward' : 
                    momentum === 'bearish' ? 'Market trending downward' : 'Market stable'
      },
      activity: {
        level: activity,
        intensity: activity === 'high' ? 'High Activity' : activity === 'medium' ? 'Moderate Activity' : 'Low Activity',
        color: activity === 'high' ? 'bg-orange-500' : activity === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
      }
    };
  }, [marketPulse]);

  // Connection status indicator
  const connectionStatus = useMemo(() => ({
    icon: isConnected ? Wifi : WifiOff,
    color: isConnected ? 'text-green-500' : 'text-red-500',
    status: connectionHealth,
    label: isConnected ? 'Connected' : connectionHealth === 'connecting' ? 'Connecting...' : 'Disconnected'
  }), [isConnected, connectionHealth]);

  // Recent updates summary
  const updatesSummary = useMemo(() => {
    const recentUpdates = realTimeUpdates.slice(0, 5);
    const updateTypes = recentUpdates.reduce((acc, update) => {
      acc[update.type] = (acc[update.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUpdates: realTimeUpdates.length,
      recentUpdates,
      updateTypes,
      lastUpdateTime: lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : null
    };
  }, [realTimeUpdates, lastUpdate]);

  if (compact) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <connectionStatus.icon className={cn("h-4 w-4", connectionStatus.color)} />
              <span className="text-sm font-medium">Market Pulse</span>
              <Badge variant="outline" className={pulseIndicators.activity.color}>
                {pulseIndicators.activity.level}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <pulseIndicators.momentum.icon className={cn("h-4 w-4", pulseIndicators.momentum.color)} />
              <span className="text-sm">{pulseIndicators.momentum.label}</span>
            </div>
          </div>
          
          {updatesSummary.lastUpdateTime && (
            <p className="text-xs text-muted-foreground mt-2">
              Last update: {updatesSummary.lastUpdateTime}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Real-Time Market Pulse
              </CardTitle>
              <CardDescription>
                Live market activity and sentiment tracking
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-2">
                    <connectionStatus.icon className={cn("h-4 w-4", connectionStatus.color)} />
                    <span className="text-sm font-medium">{connectionStatus.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Real-time connection status</p>
                </TooltipContent>
              </Tooltip>
              
              <Button
                variant="outline"
                size="sm"
                onClick={isStreaming ? stopRealTimeStream : startRealTimeStream}
                className="ml-2"
              >
                {isStreaming ? 'Pause' : 'Start'} Stream
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Market Momentum */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center gap-3">
              <pulseIndicators.momentum.icon className={cn("h-5 w-5", pulseIndicators.momentum.color)} />
              <div>
                <p className="font-medium">{pulseIndicators.momentum.label} Momentum</p>
                <p className="text-sm text-muted-foreground">{pulseIndicators.momentum.description}</p>
              </div>
            </div>
            
            <Badge variant="outline" className={pulseIndicators.activity.color}>
              {pulseIndicators.activity.intensity}
            </Badge>
          </div>

          {/* Recent Updates */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
              <Badge variant="secondary">{updatesSummary.totalUpdates}</Badge>
            </h4>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {updatesSummary.recentUpdates.length > 0 ? (
                updatesSummary.recentUpdates.map((update, index) => (
                  <div key={index} className="text-sm p-2 rounded border bg-background">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {update.type.replace('_', ' ')}
                      </span>
                      <Badge variant="outline">
                        {update.confidence.toFixed(1)}% confidence
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {update.source} • {new Date(update.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No recent updates. {!isStreaming && 'Start streaming to see live data.'}
                </p>
              )}
            </div>
          </div>

          {/* Update Types Summary */}
          {Object.keys(updatesSummary.updateTypes).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Update Types</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(updatesSummary.updateTypes).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {type.replace('_', ' ')}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {updatesSummary.lastUpdateTime && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Last update: {updatesSummary.lastUpdateTime} • 
                {isStreaming ? ' Stream active' : ' Stream paused'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

RealTimeMarketPulse.displayName = 'RealTimeMarketPulse';