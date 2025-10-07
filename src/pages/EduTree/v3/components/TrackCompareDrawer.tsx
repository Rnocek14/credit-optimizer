/**
 * Side panel comparison drawer
 * 
 * Detailed SE vs DS comparison with course lists, outcomes, and deltas
 * Opens when Track Gate or Y3 bundles are selected
 */

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface TrackDetail {
  courses: number;
  credits: number;
  list?: string[];
  outcomes?: string[];
  durationWeeks?: number;
}

interface TrackCompareDrawerProps {
  open: boolean;
  onClose: () => void;
  se: TrackDetail;
  ds: TrackDetail;
  onSelectTrack?: (trackId: 'se' | 'ds') => void;
}

export default function TrackCompareDrawer({
  open,
  onClose,
  se,
  ds,
  onSelectTrack,
}: TrackCompareDrawerProps) {
  if (!open) return null;

  const creditsDelta = Math.abs(se.credits - ds.credits);
  const coursesDelta = Math.abs(se.courses - ds.courses);
  
  return (
    <aside
      className="fixed right-0 top-0 bottom-0 w-[420px] border-l bg-background/95 backdrop-blur p-5 overflow-y-auto z-[60] shadow-xl"
      role="dialog"
      aria-label="Compare tracks"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Compare Tracks</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Stats */}
      <Card className="p-3 mb-4 bg-muted/30">
        <div className="text-xs text-muted-foreground mb-1">Delta</div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-medium">{coursesDelta}</span>
            <span className="text-muted-foreground ml-1">courses</span>
          </div>
          <div>
            <span className="font-medium">{creditsDelta}</span>
            <span className="text-muted-foreground ml-1">credits</span>
          </div>
        </div>
      </Card>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* SE Column */}
        <section>
          <h3 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Software Engineering</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Courses</dt>
              <dd className="font-medium">{se.courses}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Credits</dt>
              <dd className="font-medium">{se.credits}</dd>
            </div>
            {se.durationWeeks && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="font-medium">{se.durationWeeks} wks</dd>
              </div>
            )}
          </dl>
          
          {se.list && se.list.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">Courses</div>
              <ul className="text-xs space-y-1 list-disc ml-4">
                {se.list.map((course, i) => (
                  <li key={i} className="text-muted-foreground">{course}</li>
                ))}
              </ul>
            </div>
          )}
          
          {se.outcomes && se.outcomes.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">Outcomes</div>
              <ul className="text-xs space-y-1 list-disc ml-4">
                {se.outcomes.map((outcome, i) => (
                  <li key={i} className="text-muted-foreground">{outcome}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* DS Column */}
        <section>
          <h3 className="font-medium mb-2 text-purple-600 dark:text-purple-400">Data Science</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Courses</dt>
              <dd className="font-medium">{ds.courses}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Credits</dt>
              <dd className="font-medium">{ds.credits}</dd>
            </div>
            {ds.durationWeeks && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="font-medium">{ds.durationWeeks} wks</dd>
              </div>
            )}
          </dl>
          
          {ds.list && ds.list.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">Courses</div>
              <ul className="text-xs space-y-1 list-disc ml-4">
                {ds.list.map((course, i) => (
                  <li key={i} className="text-muted-foreground">{course}</li>
                ))}
              </ul>
            </div>
          )}
          
          {ds.outcomes && ds.outcomes.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">Outcomes</div>
              <ul className="text-xs space-y-1 list-disc ml-4">
                {ds.outcomes.map((outcome, i) => (
                  <li key={i} className="text-muted-foreground">{outcome}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Action buttons */}
      {onSelectTrack && (
        <div className="flex gap-2">
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onSelectTrack('se')}
          >
            Choose SE
          </Button>
          <Button 
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => onSelectTrack('ds')}
          >
            Choose DS
          </Button>
        </div>
      )}
    </aside>
  );
}
