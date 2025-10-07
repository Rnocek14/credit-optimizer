import React from 'react';
import { EduTreeV3Page } from './EduTreeV3Page';

function isEduTreeV3Enabled(): boolean {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('v3') === '1' || q.has('v3')) return true;
    return localStorage.getItem('flags.eduTreeV3') === 'true';
  } catch {
    return false;
  }
}

export default function EduTreeV3Route() {
  const [enabled, setEnabled] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setEnabled(isEduTreeV3Enabled());
  }, []);

  if (enabled === null) {
    return null;
  }

  if (!enabled) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-semibold mb-2">EduTree V3 (Disabled)</h1>
        <p className="text-muted-foreground mb-4">
          This feature is currently behind a feature flag.
        </p>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm mb-2">To enable:</p>
          <pre className="rounded bg-muted p-3 text-xs overflow-auto">
{`// Enable via URL
?v3=1

// Or via console
localStorage.setItem('flags.eduTreeV3', 'true'); 
location.reload();`}
          </pre>
          {import.meta.env.DEV && (
            <button
              className="mt-3 rounded px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => { 
                localStorage.setItem('flags.eduTreeV3','true'); 
                location.reload(); 
              }}
            >
              Enable and reload
            </button>
          )}
        </div>
      </div>
    );
  }

  return <EduTreeV3Page />;
}
