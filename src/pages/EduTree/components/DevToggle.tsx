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

  return (
    <div className="absolute top-4 right-4 z-50 bg-background/90 backdrop-blur-sm border rounded-lg p-2">
      <div className="text-xs text-muted-foreground mb-2">Dev Controls</div>
      <Button
        size="sm"
        variant={flags.eduTreeV2EdgeKinds ? "default" : "outline"}
        onClick={toggleV2EdgeKinds}
        className="text-xs"
      >
        V2 Edge Kinds: {flags.eduTreeV2EdgeKinds ? 'ON' : 'OFF'}
      </Button>
    </div>
  );
}