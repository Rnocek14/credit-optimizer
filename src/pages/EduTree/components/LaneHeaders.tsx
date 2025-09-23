/**
 * Context-aware lane headers for multi-gate junction system
 */

import React from 'react';
import { type FilterMode, LAYOUT_CONSTANTS } from '../data/seedDataV2';

interface LaneHeadersProps {
  filterMode: FilterMode;
}

export function LaneHeaders({ filterMode }: LaneHeadersProps) {
  const getHeadersConfig = () => {
    switch (filterMode) {
      case 'compare-programs':
        return {
          title: 'Program Comparison',
          upperLane: '',
          lowerLane: '',
          showHeaders: false
        };
      case 'compare-tracks':
        return {
          title: 'CS Tracks',
          upperLane: 'Software Engineering',
          lowerLane: 'Data Science',
          showHeaders: true
        };
      case 'bs_cs':
        return {
          title: 'Computer Science',
          upperLane: 'CS Core Path',
          lowerLane: 'Track Specialization',
          showHeaders: true
        };
      case 'bs_it':
        return {
          title: 'Information Technology',
          upperLane: 'IT Core Path',
          lowerLane: '',
          showHeaders: true
        };
      case 'se':
        return {
          title: 'Software Engineering',
          upperLane: 'SE Track',
          lowerLane: '',
          showHeaders: true
        };
      case 'ds':
        return {
          title: 'Data Science',
          upperLane: 'DS Track',
          lowerLane: '',
          showHeaders: true
        };
      default:
        return {
          title: 'All Paths',
          upperLane: 'Upper Lane',
          lowerLane: 'Lower Lane',
          showHeaders: false
        };
    }
  };

  const config = getHeadersConfig();

  if (!config.showHeaders) {
    return null;
  }

  return (
    <>
      {/* Main title header */}
      <div 
        className="absolute z-10 px-4 py-2 bg-background/90 backdrop-blur border rounded-lg shadow-sm"
        style={{
          left: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y2 + 100,
          top: 20
        }}
      >
        <div className="text-sm font-semibold text-foreground">{config.title}</div>
      </div>

      {/* Upper lane header */}
      {config.upperLane && (
        <div 
          className="absolute z-10 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs font-medium text-blue-600 dark:text-blue-400"
          style={{
            left: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y2 - 20,
            top: LAYOUT_CONSTANTS.LANE_ROWS.UP_CORE - 40
          }}
        >
          {config.upperLane}
        </div>
      )}

      {/* Lower lane header */}
      {config.lowerLane && (
        <div 
          className="absolute z-10 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs font-medium text-green-600 dark:text-green-400"
          style={{
            left: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y2 - 20,
            top: LAYOUT_CONSTANTS.LANE_ROWS.DOWN_CORE + 40
          }}
        >
          {config.lowerLane}
        </div>
      )}

      {/* Adaptive midline spine */}
      <div 
        className="absolute w-full border-t border-dashed border-muted-foreground/20 z-0"
        style={{
          top: LAYOUT_CONSTANTS.LANE_ROWS.GATE_Y,
          left: 0,
          right: 0
        }}
      />
    </>
  );
}