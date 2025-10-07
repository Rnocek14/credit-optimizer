/**
 * Compare mode toggle button
 * 
 * Small button to enable/disable comparison UI
 * Position: near Track Gate or in toolbar
 */

import React from 'react';
import { GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompareToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export default function CompareToggle({ enabled, onToggle }: CompareToggleProps) {
  return (
    <Button
      variant={enabled ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      className="gap-2"
      title="Compare SE vs DS tracks"
    >
      <GitCompare className="h-4 w-4" />
      Compare Tracks
    </Button>
  );
}
