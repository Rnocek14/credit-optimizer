import { useMemo } from 'react';
import type { BasketItem } from '../state/usePlanBasket';

export interface TimelineLayout {
  layout: Map<string, { x: number; y: number; lane: number; startWeek: number; endWeek: number }>;
  maxWeeks: number;
  overflow: boolean;
  conflicts: Array<{ courseId1: string; courseId2: string }>;
}

const WEEK_WIDTH = 40;
const LANE_HEIGHT = 100;

/**
 * Pack courses into timeline lanes respecting concurrency constraints and topological ordering
 * Ensures courses start after all prerequisites finish
 */
export function useTimelinePack(
  items: BasketItem[],
  maxConcurrent: number,
  allOptions?: any[] // For prereq resolution
): TimelineLayout {
  return useMemo(() => {
    const layout = new Map<string, { x: number; y: number; lane: number; startWeek: number; endWeek: number }>();
    const lanes: Array<{ endWeek: number; courses: string[] }> = [];
    const conflicts: Array<{ courseId1: string; courseId2: string }> = [];
    
    // Build prereq map for topological ordering
    const prereqMap = new Map<string, string[]>();
    items.forEach(item => {
      const option = allOptions?.find(o => o.courseId === item.courseId);
      prereqMap.set(item.courseId, option?.prereq_course_ids ?? []);
    });
    
    // Calculate earliest start week for each course
    const earliestStartWeek = new Map<string, number>();
    const calculateEarliestStart = (courseId: string, visited = new Set<string>()): number => {
      if (earliestStartWeek.has(courseId)) {
        return earliestStartWeek.get(courseId)!;
      }
      
      if (visited.has(courseId)) return 0; // Circular dependency
      visited.add(courseId);
      
      const prereqs = prereqMap.get(courseId) ?? [];
      if (prereqs.length === 0) return 0;
      
      let maxEnd = 0;
      prereqs.forEach(prereqId => {
        const prereqItem = items.find(i => i.courseId === prereqId);
        if (prereqItem) {
          const prereqStart = calculateEarliestStart(prereqId, new Set(visited));
          const prereqDuration = prereqItem.duration_weeks ?? 8;
          maxEnd = Math.max(maxEnd, prereqStart + prereqDuration);
        }
      });
      
      earliestStartWeek.set(courseId, maxEnd);
      return maxEnd;
    };
    
    items.forEach(item => {
      calculateEarliestStart(item.courseId);
    });
    
    // Sort by status: pinned first, then auto-filled
    const sorted = [...items].sort((a, b) => {
      if (a.status === 'pinned' && b.status !== 'pinned') return -1;
      if (a.status !== 'pinned' && b.status === 'pinned') return 1;
      return 0;
    });
    
    let currentWeek = 0;
    
    sorted.forEach(item => {
      const duration = item.duration_weeks ?? 8;
      const earliestStart = earliestStartWeek.get(item.courseId) ?? 0;
      
      // Enforce topological ordering
      currentWeek = Math.max(currentWeek, earliestStart);
      
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
          currentWeek = Math.max(nextFree, earliestStart);
          lane = lanes.findIndex(l => l.endWeek <= currentWeek);
          
          if (lane === -1) {
            lane = 0; // Fallback to first lane
          }
        }
      }
      
      const startWeek = currentWeek;
      const endWeek = currentWeek + duration;
      
      // Assign to lane
      layout.set(item.courseId, {
        x: startWeek * WEEK_WIDTH,
        y: lane * LANE_HEIGHT,
        lane,
        startWeek,
        endWeek
      });
      
      lanes[lane].endWeek = endWeek;
      lanes[lane].courses.push(item.courseId);
    });
    
    // Calculate max weeks
    const maxWeeks = Math.max(...lanes.map(l => l.endWeek), 0);
    
    // Check for overflow: track week-by-week occupancy
    const weekOccupancy = new Map<number, string[]>();
    layout.forEach((pos, courseId) => {
      for (let week = pos.startWeek; week < pos.endWeek; week++) {
        if (!weekOccupancy.has(week)) {
          weekOccupancy.set(week, []);
        }
        weekOccupancy.get(week)!.push(courseId);
      }
    });
    
    let overflow = false;
    weekOccupancy.forEach((courses, week) => {
      if (courses.length > maxConcurrent) {
        overflow = true;
        // Add conflicts for overlapping courses
        for (let i = 0; i < courses.length; i++) {
          for (let j = i + 1; j < courses.length; j++) {
            conflicts.push({
              courseId1: courses[i],
              courseId2: courses[j]
            });
          }
        }
      }
    });
    
    return {
      layout,
      maxWeeks,
      overflow,
      conflicts
    };
  }, [items, maxConcurrent, allOptions]);
}
