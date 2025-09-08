import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OKLCHColorDemo() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>OKLCH Color System Demo</CardTitle>
        <p className="text-sm text-muted-foreground">
          New WCAG-compliant colors - toggle dark mode to see contrast improvements
        </p>
      </CardHeader>
      <CardContent>
        {/* Color swatches to immediately show the fix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="p-3 rounded bg-accent-cyan text-accent-cyan-foreground text-center text-sm font-medium">
            Cyan Overlay
          </div>
          <div className="p-3 rounded bg-accent-gold text-accent-gold-foreground text-center text-sm font-medium">
            Gold Highlight
          </div>
          <div className="p-3 rounded bg-accent-lime text-accent-lime-foreground text-center text-sm font-medium">
            Lime Success
          </div>
          <div 
            className="p-3 rounded text-center text-sm font-medium text-foreground"
            style={{ background: 'var(--gradient-primary)' }}
          >
            Gradient
          </div>
        </div>

        {/* Risk matrix colors */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Risk Matrix (Credit Transfer)</h4>
          <div className="flex flex-wrap gap-2">
            <span className="rounded px-3 py-1 bg-risk-low text-risk-low-foreground text-xs font-medium">
              Low Risk
            </span>
            <span className="rounded px-3 py-1 bg-risk-medium text-risk-medium-foreground text-xs font-medium">
              Medium Risk
            </span>
            <span className="rounded px-3 py-1 bg-risk-high text-risk-high-foreground text-xs font-medium">
              High Risk
            </span>
            <span className="rounded px-3 py-1 bg-risk-critical text-risk-critical-foreground text-xs font-medium">
              Critical Risk
            </span>
          </div>
        </div>

        {/* Overlay legend example */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Path Overlays</h4>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-accent-cyan text-accent-cyan-foreground text-xs">
              <div className="w-2 h-2 rounded-full bg-current opacity-70"></div>
              Fastest Path
            </div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-accent-gold text-accent-gold-foreground text-xs">
              <div className="w-2 h-2 rounded-full bg-current opacity-70"></div>
              Cheapest Path
            </div>  
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-accent-lime text-accent-lime-foreground text-xs">
              <div className="w-2 h-2 rounded-full bg-current opacity-70"></div>
              Max Credits
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}