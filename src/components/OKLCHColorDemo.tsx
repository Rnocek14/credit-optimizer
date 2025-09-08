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
        {/* Immediate OKLCH color demo */}
        <div className="space-y-3">
          <div className="text-sm opacity-80">OKLCH Color System Demo (toggle dark mode)</div>
          <div className="lp-grid">
            <div className="lp-swatch bg-accent-cyan">Cyan Overlay</div>
            <div className="lp-swatch bg-accent-gold">Gold Highlight</div>
            <div className="lp-swatch bg-accent-lime">Lime Success</div>
            <div className="lp-swatch gradient-primary">Primary Gradient</div>
            <div className="lp-swatch bg-risk-low">Risk: Low</div>
            <div className="lp-swatch bg-risk-medium">Risk: Medium</div>
            <div className="lp-swatch bg-risk-high">Risk: High</div>
            <div className="lp-swatch bg-risk-critical">Risk: Critical</div>
          </div>
        </div>

        {/* Overlay legend example */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Live Path Overlays</h4>
          <div className="flex flex-wrap gap-2">
            <span className="lp-swatch bg-accent-cyan">Overlay: Fastest</span>
            <span className="lp-swatch bg-accent-gold">Overlay: Cheapest</span>
            <span className="lp-swatch bg-accent-lime">Overlay: Credits</span>
            <span className="lp-swatch bg-risk-high">High Risk</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}