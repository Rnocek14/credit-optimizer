import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TRACK_DEFINITIONS, TrackDefinition } from '../data/trackDefinitions';
import { useFeatureFlags } from '@/lib/featureFlags';

interface TrackSelectorProps {
  primaryTrack?: TrackDefinition;
  comparisonTrack?: TrackDefinition;
  onPrimaryTrackChange: (track?: TrackDefinition) => void;
  onComparisonTrackChange: (track?: TrackDefinition) => void;
  comparisonEnabled: boolean;
  onComparisonToggle: (enabled: boolean) => void;
  isVisible: boolean;
}

export function TrackSelector({
  primaryTrack,
  comparisonTrack,
  onPrimaryTrackChange,
  onComparisonTrackChange,
  comparisonEnabled,
  onComparisonToggle,
  isVisible
}: TrackSelectorProps) {
  const flags = useFeatureFlags();

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="absolute top-4 right-4 p-4 bg-background/95 backdrop-blur-sm border z-40 w-80">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="font-medium">Track Comparison</Label>
          <Badge variant="secondary" className="text-xs">
            Multi-Path
          </Badge>
        </div>

        {/* Primary Track Selection */}
        <div className="space-y-2">
          <Label htmlFor="primary-track" className="text-sm font-medium">
            Primary Track
          </Label>
          <Select
            value={primaryTrack?.id || ''}
            onValueChange={(value) => {
              const track = TRACK_DEFINITIONS.find(t => t.id === value);
              onPrimaryTrackChange(track);
            }}
          >
            <SelectTrigger id="primary-track">
              <SelectValue placeholder="Select primary track..." />
            </SelectTrigger>
            <SelectContent>
              {TRACK_DEFINITIONS.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full border" 
                      style={{ backgroundColor: track.color, borderColor: track.color }}
                    />
                    {track.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comparison Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="comparison-toggle" className="text-sm font-medium">
            Enable Comparison
          </Label>
          <Switch
            id="comparison-toggle"
            checked={comparisonEnabled}
            onCheckedChange={onComparisonToggle}
          />
        </div>

        {/* Comparison Track Selection */}
        {comparisonEnabled && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <Label htmlFor="comparison-track" className="text-sm font-medium">
              Comparison Track
            </Label>
            <Select
              value={comparisonTrack?.id || ''}
              onValueChange={(value) => {
                const track = TRACK_DEFINITIONS.find(t => t.id === value);
                onComparisonTrackChange(track);
              }}
            >
              <SelectTrigger id="comparison-track">
                <SelectValue placeholder="Select comparison track..." />
              </SelectTrigger>
              <SelectContent>
                {TRACK_DEFINITIONS
                  .filter(track => track.id !== primaryTrack?.id)
                  .map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full border-2 border-dashed" 
                          style={{ borderColor: track.color }}
                        />
                        {track.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Track Info */}
        {(primaryTrack || comparisonTrack) && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground">Track Info</Label>
            {primaryTrack && (
              <div className="text-xs">
                <span className="font-medium" style={{ color: primaryTrack.color }}>
                  {primaryTrack.name}:
                </span>
                <span className="ml-1 text-muted-foreground">
                  {primaryTrack.blockIds.length} blocks
                </span>
              </div>
            )}
            {comparisonTrack && (
              <div className="text-xs">
                <span className="font-medium" style={{ color: comparisonTrack.color }}>
                  {comparisonTrack.name}:
                </span>
                <span className="ml-1 text-muted-foreground">
                  {comparisonTrack.blockIds.length} blocks
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}