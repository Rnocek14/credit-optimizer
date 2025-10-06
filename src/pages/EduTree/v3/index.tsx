import React from 'react';
import { EduTreeV3Page } from './EduTreeV3Page';

export default function EduTreeV3Route() {
  // Feature flag check - V3 is enabled via localStorage
  const isEnabled = typeof window !== 'undefined' && 
    localStorage.getItem('flags.eduTreeV3') === 'true';

  if (!isEnabled) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-semibold mb-2">EduTree V3 (Disabled)</h1>
        <p className="text-muted-foreground mb-4">
          This feature is currently behind a feature flag.
        </p>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm mb-2">To enable, run this in the console:</p>
          <code className="block bg-muted p-2 rounded text-sm">
            localStorage.setItem('flags.eduTreeV3', 'true')
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Then refresh the page.
          </p>
        </div>
      </div>
    );
  }

  return <EduTreeV3Page />;
}
