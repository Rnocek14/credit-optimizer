/**
 * Unit tests for vertical layout engine
 * 
 * Validates:
 * - Determinism (same input → same output)
 * - Grid alignment (all positions % 8 === 0)
 * - Y3 fork geometry (same Y, different X)
 * - No overlaps by construction
 * - Handle positions (all top/bottom)
 */

import { describe, it, expect } from 'vitest';
import { calculateVerticalLayout, validateVerticalLayout } from '../layoutEngineVertical';
import { VERT } from '../../utils/layoutTokensVertical';
import type { V3Node } from '../../types/v3';

describe('calculateVerticalLayout', () => {
  const createTestNodes = (): V3Node[] => [
    { id: 'y1-bundle', type: 'track-bundle', data: { year: 1 }, position: { x: 0, y: 0 } },
    { id: 'gate-y2-programs', type: 'gate', data: { year: 2 }, position: { x: 0, y: 0 } },
    { id: 'y2-bundle', type: 'track-bundle', data: { year: 2 }, position: { x: 0, y: 0 } },
    { id: 'gate-y3-tracks', type: 'gate', data: { year: 3 }, position: { x: 0, y: 0 } },
    { id: 'y3-se-bundle', type: 'track-bundle', data: { year: 3, trackId: 'se' }, position: { x: 0, y: 0 } },
    { id: 'y3-ds-bundle', type: 'track-bundle', data: { year: 3, trackId: 'ds' }, position: { x: 0, y: 0 } },
    { id: 'y4-bundle', type: 'track-bundle', data: { year: 4 }, position: { x: 0, y: 0 } },
  ];

  it('produces deterministic output', () => {
    const nodes = createTestNodes();
    const result1 = calculateVerticalLayout(nodes);
    const result2 = calculateVerticalLayout(nodes);
    
    expect(result1).toEqual(result2);
  });

  it('snaps all positions to grid', () => {
    const nodes = createTestNodes();
    const result = calculateVerticalLayout(nodes);
    
    result.forEach(node => {
      expect(node.position.x % VERT.GRID).toBe(0);
      expect(node.position.y % VERT.GRID).toBe(0);
    });
  });

  it('creates monotonically increasing Y for spine nodes', () => {
    const nodes = createTestNodes();
    const result = calculateVerticalLayout(nodes);
    
    const y1 = result.find(n => n.id === 'y1-bundle')!;
    const pg = result.find(n => n.id === 'gate-y2-programs')!;
    const y2 = result.find(n => n.id === 'y2-bundle')!;
    const tg = result.find(n => n.id === 'gate-y3-tracks')!;
    const y4 = result.find(n => n.id === 'y4-bundle')!;
    
    expect(y1.position.y).toBe(0);
    expect(pg.position.y).toBeGreaterThan(y1.position.y);
    expect(y2.position.y).toBeGreaterThan(pg.position.y);
    expect(tg.position.y).toBeGreaterThan(y2.position.y);
    expect(y4.position.y).toBeGreaterThan(tg.position.y);
  });

  it('places Y3 branches side-by-side at same Y', () => {
    const nodes = createTestNodes();
    const result = calculateVerticalLayout(nodes);
    
    const se = result.find(n => n.id === 'y3-se-bundle')!;
    const ds = result.find(n => n.id === 'y3-ds-bundle')!;
    
    // Same Y
    expect(se.position.y).toBe(ds.position.y);
    
    // SE left of DS
    expect(se.position.x).toBeLessThan(ds.position.x);
    
    // Reasonable separation
    expect(ds.position.x - se.position.x).toBeGreaterThanOrEqual(VERT.H_SPACING);
  });

  it('centers spine nodes on CENTER_X', () => {
    const nodes = createTestNodes();
    const result = calculateVerticalLayout(nodes);
    
    const y1 = result.find(n => n.id === 'y1-bundle')!;
    const y2 = result.find(n => n.id === 'y2-bundle')!;
    const y4 = result.find(n => n.id === 'y4-bundle')!;
    
    expect(y1.position.x).toBe(VERT.CENTER_X);
    expect(y2.position.x).toBe(VERT.CENTER_X);
    expect(y4.position.x).toBe(VERT.CENTER_X);
  });

  it('sets all handles to top/bottom', () => {
    const nodes = createTestNodes();
    const result = calculateVerticalLayout(nodes);
    
    result.forEach(node => {
      expect(node.sourcePosition).toBe('bottom');
      expect(node.targetPosition).toBe('top');
    });
  });

  it('validates no overlaps', () => {
    const nodes = createTestNodes();
    const result = calculateVerticalLayout(nodes);
    
    expect(validateVerticalLayout(result)).toBe(true);
  });

  it('handles missing nodes gracefully', () => {
    const nodes: V3Node[] = [
      { id: 'y1-bundle', type: 'track-bundle', data: { year: 1 }, position: { x: 0, y: 0 } },
      { id: 'y4-bundle', type: 'track-bundle', data: { year: 4 }, position: { x: 0, y: 0 } },
    ];
    
    const result = calculateVerticalLayout(nodes);
    
    // Should not throw, positions should still be valid
    expect(result.length).toBe(2);
    expect(validateVerticalLayout(result)).toBe(true);
  });
});

describe('validateVerticalLayout', () => {
  it('detects overlaps when they exist', () => {
    const nodes: V3Node[] = [
      { id: 'a', type: 'track-bundle', data: {}, position: { x: 0, y: 0 } },
      { id: 'b', type: 'track-bundle', data: {}, position: { x: 0, y: 10 } }, // too close
    ];
    
    expect(validateVerticalLayout(nodes)).toBe(false);
  });

  it('passes when no overlaps exist', () => {
    const nodes: V3Node[] = [
      { id: 'a', type: 'track-bundle', data: {}, position: { x: 0, y: 0 } },
      { id: 'b', type: 'track-bundle', data: {}, position: { x: 0, y: 250 } }, // far enough
    ];
    
    expect(validateVerticalLayout(nodes)).toBe(true);
  });
});
