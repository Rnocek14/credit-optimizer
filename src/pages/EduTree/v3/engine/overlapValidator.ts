import { V3Node } from '../types/v3';

export function validateNoOverlaps(
  nodes: V3Node[],
  t: typeof import('../utils/layoutTokensV3').LAYOUT_TOKENS
): { hasOverlaps: boolean; overlaps: Array<{ a: string; b: string }> } {
  const overlaps: Array<{ a: string; b: string }> = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const A = nodes[i], B = nodes[j];
      const xOverlap = !(A.position.x + t.NODE_WIDTH <= B.position.x ||
                         B.position.x + t.NODE_WIDTH <= A.position.x);
      const yOverlap = !(A.position.y + t.NODE_MAX_HEIGHT <= B.position.y ||
                         B.position.y + t.NODE_MAX_HEIGHT <= A.position.y);
      if (xOverlap && yOverlap) overlaps.push({ a: A.id, b: B.id });
    }
  }
  
  return { hasOverlaps: overlaps.length > 0, overlaps };
}
