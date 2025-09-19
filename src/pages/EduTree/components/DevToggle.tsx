import React from 'react';
import { Button } from '@/components/ui/button';
import { useFeatureFlags } from '@/lib/featureFlags';

export function DevToggle() {
  const flags = useFeatureFlags();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const toggleV2EdgeKinds = () => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get('eduTreeV2EdgeKinds');
    const newValue = current === 'true' ? 'false' : 'true';
    url.searchParams.set('eduTreeV2EdgeKinds', newValue);
    window.location.href = url.toString();
  };

  const toggleTrackMode = () => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get('track');
    const newValue = current === 'compare' ? 'se' : 'compare';
    url.searchParams.set('track', newValue);
    window.location.href = url.toString();
  };

  const currentTrack = new URLSearchParams(window.location.search).get('track') || 'se';

  return (
    <div className="absolute top-4 right-4 z-50 bg-background/90 backdrop-blur-sm border rounded-lg p-2 space-y-2">
      <div className="text-xs text-muted-foreground mb-2">Dev Controls</div>
      <Button
        size="sm"
        variant={flags.eduTreeV2EdgeKinds ? "default" : "outline"}
        onClick={toggleV2EdgeKinds}
        className="text-xs w-full"
      >
        V2 Edge Kinds: {flags.eduTreeV2EdgeKinds ? 'ON' : 'OFF'}
      </Button>
      <Button
        size="sm"
        variant={currentTrack === 'compare' ? "default" : "outline"}
        onClick={toggleTrackMode}
        className="text-xs w-full"
      >
        Arrows: {currentTrack === 'compare' ? 'ON' : 'OFF'}
      </Button>
    </div>
  );
}