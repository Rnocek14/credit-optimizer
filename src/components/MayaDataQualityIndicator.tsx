import { Badge } from "@/components/ui/badge";
import { Database, Wifi, WifiOff } from "lucide-react";

interface MayaDataQualityIndicatorProps {
  isUsingMockData?: boolean;
  lastRefreshed?: Date | null;
  isConnected?: boolean;
  variant?: 'default' | 'compact';
}

export function MayaDataQualityIndicator({ 
  isUsingMockData = false, 
  lastRefreshed, 
  isConnected = true,
  variant = 'default' 
}: MayaDataQualityIndicatorProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        {isUsingMockData && (
          <Badge variant="outline" className="h-4 px-1 text-xs">
            Mock
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className="text-muted-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {isUsingMockData ? (
        <Badge variant="outline" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Mock Data
        </Badge>
      ) : (
        <Badge variant="default" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Real Data
        </Badge>
      )}
      
      {lastRefreshed && (
        <span className="text-xs text-muted-foreground">
          Updated: {formatTime(lastRefreshed)}
        </span>
      )}
    </div>
  );
}