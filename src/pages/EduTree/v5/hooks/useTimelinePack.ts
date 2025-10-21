import { useMemo } from 'react';
import type { BasketItem } from '../state/usePlanBasket';

export interface TimelineLayout {
  layout: Map<string, { x: number; y: number; lane: number }>;
  maxWeeks: number;
  overflow: boolean;
  conflicts: Array<{ courseId1: string; courseId2: string }>;
}

const WEEK_WIDTH = 40;
const LANE_HEIGHT = 100;

/**
 * Pack courses into timeline lanes respecting concurrency constraints
 * Greedy algorithm: assign each course to first available lane
 */
export function useTimelinePack(
  items: BasketItem[],
  maxConcurrent: number
): TimelineLayout {
  return useMemo(() => {
    const layout = new Map<string, { x: number; y: number; lane: number }>();
    const lanes: Array<{ endWeek: number; courses: string[] }> = [];
    const conflicts: Array<{ courseId1: string; courseId2: string }> = [];
    
    // Sort by status: pinned first, then auto-filled
    const sorted = [...items].sort((a, b) => {
      if (a.status === 'pinned' && b.status !== 'pinned') return -1;
      if (a.status !== 'pinned' && b.status === 'pinned') return 1;
      return 0;
    });
    
    let currentWeek = 0;
    
    sorted.forEach(item => {
      const duration = item.duration_weeks ?? 8;
      
      // Find first available lane
      let lane = lanes.findIndex(l => l.endWeek <= currentWeek);
      
      if (lane === -1) {
        // All lanes occupied, try to create new lane
        if (lanes.length < maxConcurrent) {
          lane = lanes.length;
          lanes.push({ endWeek: 0, courses: [] });
        } else {
          // All lanes full → wait for next available slot
          const nextFree = Math.min(...lanes.map(l => l.endWeek));
          currentWeek = nextFree;
          lane = lanes.findIndex(l => l.endWeek === nextFree);
        }
      }
      
      // Assign to lane
      layout.set(item.courseId, {
        x: currentWeek * WEEK_WIDTH,
        y: lane * LANE_HEIGHT,
        lane
      });
      
      lanes[lane].endWeek = currentWeek + duration;
      lanes[lane].courses.push(item.courseId);
    });
    
    // Calculate max weeks
    const maxWeeks = Math.max(...lanes.map(l => l.endWeek), 0);
    
    // Check for overflow (shouldn't happen with greedy algorithm, but defensive)
    const overflow = lanes.length > maxConcurrent;
    
    return {
      layout,
      maxWeeks,
      overflow,
      conflicts
    };
  }, [items, maxConcurrent]);
}
