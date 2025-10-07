import { describe, it, expect } from 'vitest';
import { calculateLayout } from '../engine/layoutEngine';
import { computeRegions } from '../engine/regionManager';
import { resolveCollisions } from '../engine/collisionResolver';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { V3Node } from '../types/v3';

function generateNodes(count: number): V3Node[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    type: 'requirement' as const,
    data: {
      year: ((i % 4) + 1) as 1 | 2 | 3 | 4,
      programId: 'bs_cs',
      trackId: i % 3 === 0 ? 'se' : i % 3 === 1 ? 'ds' : undefined
    },
    position: { x: 0, y: 0 }
  }));
}

describe('performance tests', () => {
  it('resolveCollisions @ N=50 < 10ms', () => {
    const nodes = generateNodes(50);
    const positioned = calculateLayout(nodes, LAYOUT_TOKENS);
    const regions = computeRegions(positioned, LAYOUT_TOKENS);
    
    const start = performance.now();
    resolveCollisions(positioned, regions, LAYOUT_TOKENS);
    const duration = performance.now() - start;
    
    console.log(`resolveCollisions(50 nodes): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(10);
  });

  it('resolveCollisions @ N=100 < 25ms', () => {
    const nodes = generateNodes(100);
    const positioned = calculateLayout(nodes, LAYOUT_TOKENS);
    const regions = computeRegions(positioned, LAYOUT_TOKENS);
    
    const start = performance.now();
    resolveCollisions(positioned, regions, LAYOUT_TOKENS);
    const duration = performance.now() - start;
    
    console.log(`resolveCollisions(100 nodes): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(25);
  });

  it('resolveCollisions @ N=200 < 50ms', () => {
    const nodes = generateNodes(200);
    const positioned = calculateLayout(nodes, LAYOUT_TOKENS);
    const regions = computeRegions(positioned, LAYOUT_TOKENS);
    
    const start = performance.now();
    resolveCollisions(positioned, regions, LAYOUT_TOKENS);
    const duration = performance.now() - start;
    
    console.log(`resolveCollisions(200 nodes): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50);
  });

  it('full pipeline @ N=100 < 50ms', () => {
    const nodes = generateNodes(100);
    
    const start = performance.now();
    const positioned = calculateLayout(nodes, LAYOUT_TOKENS);
    const regions = computeRegions(positioned, LAYOUT_TOKENS);
    resolveCollisions(positioned, regions, LAYOUT_TOKENS);
    const duration = performance.now() - start;
    
    console.log(`Full pipeline(100 nodes): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50);
  });
});
