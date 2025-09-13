import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Route, GitBranch, Eye, EyeOff } from 'lucide-react';
import { SimpleTrackPicker } from './SimpleTrackPicker';
import { TRACK_DEFINITIONS, type TrackId } from '../data/trackDefinitions';

export interface TrackComparisonControlsProps {
  overlayEnabled: boolean;
  onOverlayToggle: (enabled: boolean) => void;
  primaryTrackId?: TrackId;
  onPrimaryTrackChange: (trackId: TrackId | undefined) => void;
  comparisonTrackId?: TrackId;
  onComparisonTrackChange: (trackId: TrackId | undefined) => void;
  debugInfo?: {
    overlayReady: boolean;
    resolvedBlocks: number;
    anyMatches: boolean;
    primaryCount: number;
    comparisonCount: number;
    sharedCount: number;
  };
}

export function TrackComparisonControls({
  overlayEnabled,
  onOverlayToggle,
  primaryTrackId,
  onPrimaryTrackChange,
  comparisonTrackId,
  onComparisonTrackChange,
  debugInfo
}: TrackComparisonControlsProps) {

  const primaryTrack = TRACK_DEFINITIONS.find(t => t.id === primaryTrackId);
  const comparisonTrack = TRACK_DEFINITIONS.find(t => t.id === comparisonTrackId);

  const handleClearComparison = () => {
    onComparisonTrackChange(undefined);
  };

  return (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Route className="h-4 w-4" />
          Track Comparison
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overlay Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="overlay-toggle" className="text-sm">
            Enable Overlay
          </Label>
          <div className="flex items-center gap-2">
            {overlayEnabled ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Switch
              id="overlay-toggle"
              checked={overlayEnabled}
              onCheckedChange={onOverlayToggle}
            />
          </div>
        </div>

        {overlayEnabled && (
          <>
            {/* Primary Track Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Primary Track</Label>
              <SimpleTrackPicker
                value={primaryTrackId}
                onChange={onPrimaryTrackChange}
                placeholder="Select primary track..."
              />
              {primaryTrack && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: primaryTrack.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {primaryTrack.description}
                  </span>
                </div>
              )}
            </div>

            {/* Comparison Track Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Compare With</Label>
                {comparisonTrackId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearComparison}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <SimpleTrackPicker
                value={comparisonTrackId}
                onChange={onComparisonTrackChange}
                placeholder="Optional comparison track..."
                excludeValue={primaryTrackId}
              />
              {comparisonTrack && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: comparisonTrack.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {comparisonTrack.description}
                  </span>
                </div>
              )}
            </div>

            {/* Status Badges */}
            {primaryTrackId && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="text-xs">
                  <GitBranch className="h-3 w-3 mr-1" />
                  Primary: {debugInfo?.primaryCount || 0} blocks
                </Badge>
                {comparisonTrackId && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      Compare: {debugInfo?.comparisonCount || 0} blocks
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Shared: {debugInfo?.sharedCount || 0} blocks
                    </Badge>
                  </>
                )}
              </div>
            )}

            {/* Debug Info (DEV only) */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <div>OverlayReady: {String(debugInfo.overlayReady)}</div>
                <div>Resolved Blocks: {debugInfo.resolvedBlocks}</div>
                <div>Any Matches: {String(debugInfo.anyMatches)}</div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}