// Edge routing helpers for Visual V2
// Provides detour routing to avoid node collisions

import { Position } from '@xyflow/react';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  id?: string;
}

export interface RouteOptions {
  sourcePos: Position;
  targetPos: Position;
  obstacles: Rect[];
  padding: number;
  laneOffsets: number[];
}

/**
 * Routes an edge with detours to avoid node collisions
 */
export function routeWithDetours(
  source: Point,
  target: Point,
  options: RouteOptions
): Point[] {
  const { obstacles, padding, laneOffsets } = options;
  
  // Start with direct path
  let waypoints = [source, target];
  
  // Check if direct path intersects any obstacles
  const directPath = createLineSegments(waypoints);
  const hasCollision = obstacles.some(obstacle => 
    lineIntersectsRect(directPath[0], expandRect(obstacle, padding))
  );
  
  if (!hasCollision) {
    return waypoints;
  }

  // Find a clear vertical lane between source and target
  const midX = (source.x + target.x) / 2;
  
  for (const offset of laneOffsets) {
    const laneX = midX + offset;
    const laneRect = {
      x: laneX - 2,
      y: Math.min(source.y, target.y) - padding,
      width: 4,
      height: Math.abs(target.y - source.y) + 2 * padding
    };
    
    // Check if this lane collides with any obstacles
    const hasLaneCollision = obstacles.some(obstacle =>
      rectsOverlap(laneRect, expandRect(obstacle, padding))
    );
    
    if (!hasLaneCollision) {
      // Use this lane for routing
      return [
        source,
        { x: laneX, y: source.y },
        { x: laneX, y: target.y },
        target
      ];
    }
  }
  
  // Fallback: use original points with increased padding
  return waypoints;
}

/**
 * Creates line segments from waypoints
 */
function createLineSegments(waypoints: Point[]): Array<{start: Point, end: Point}> {
  const segments = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    segments.push({
      start: waypoints[i],
      end: waypoints[i + 1]
    });
  }
  return segments;
}

/**
 * Checks if a line segment intersects a rectangle
 */
function lineIntersectsRect(
  line: {start: Point, end: Point},
  rect: Rect
): boolean {
  const { start, end } = line;
  const { x, y, width, height } = rect;
  
  // Check if either endpoint is inside the rectangle
  if (pointInRect(start, rect) || pointInRect(end, rect)) {
    return true;
  }
  
  // Check if line intersects any edge of the rectangle
  const rectEdges = [
    { start: { x, y }, end: { x: x + width, y } },
    { start: { x: x + width, y }, end: { x: x + width, y: y + height } },
    { start: { x: x + width, y: y + height }, end: { x, y: y + height } },
    { start: { x, y: y + height }, end: { x, y } }
  ];
  
  return rectEdges.some(edge => linesIntersect(line, edge));
}

/**
 * Checks if a point is inside a rectangle
 */
function pointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width &&
         point.y >= rect.y && 
         point.y <= rect.y + rect.height;
}

/**
 * Checks if two line segments intersect
 */
function linesIntersect(
  line1: {start: Point, end: Point},
  line2: {start: Point, end: Point}
): boolean {
  const { start: a, end: b } = line1;
  const { start: c, end: d } = line2;
  
  const det = (b.x - a.x) * (d.y - c.y) - (d.x - c.x) * (b.y - a.y);
  if (det === 0) return false; // Parallel lines
  
  const t = ((c.x - a.x) * (d.y - c.y) - (d.x - c.x) * (c.y - a.y)) / det;
  const u = ((c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)) / det;
  
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Checks if two rectangles overlap
 */
function rectsOverlap(rect1: Rect, rect2: Rect): boolean {
  return !(rect1.x + rect1.width < rect2.x || 
           rect2.x + rect2.width < rect1.x || 
           rect1.y + rect1.height < rect2.y || 
           rect2.y + rect2.height < rect1.y);
}

/**
 * Expands a rectangle by padding
 */
function expandRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + 2 * padding,
    height: rect.height + 2 * padding
  };
}

/**
 * Default lane offsets for detour routing
 */
export const DEFAULT_LANE_OFFSETS = [0, 40, -40, 80, -80, 120, -120, 160, -160];

/**
 * Converts waypoints to SVG path string
 */
export function waypointsToPath(waypoints: Point[]): string {
  if (waypoints.length < 2) return '';
  
  const [start, ...rest] = waypoints;
  let path = `M ${start.x} ${start.y}`;
  
  rest.forEach(point => {
    path += ` L ${point.x} ${point.y}`;
  });
  
  return path;
}