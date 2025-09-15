import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import { layoutNodes } from '@/lib/layout/simpleLayout';

describe('EduTree layout', () => {
  it('places B.S. Software Engineering node in year 5', async () => {
    const nodes: Node[] = [
      { id: 'a', type: 'blockGroup', position: { x: 0, y: 0 }, data: { level_year: 1 } },
      { id: 'degree-completion', type: 'terminalNode', position: { x: 0, y: 0 }, data: { level_year: 5, block: { title: 'B.S. Software Engineering' } } }
    ];
    const { nodes: laidOut } = await layoutNodes(nodes, []);
    const degreeNode = laidOut.find(n => n.id === 'degree-completion');
    const expectedX = 40 + (5 - 1) * 520;
    expect(degreeNode?.position.x).toBe(expectedX);
  });

  it('stacks nodes of the same year without overlap', async () => {
    const nodes: Node[] = [
      {
        id: 'block-1',
        type: 'blockGroup',
        position: { x: 0, y: 0 },
        data: { level_year: 1, sortOrder: 0, block: { courses: [1, 2, 3] } }
      },
      {
        id: 'block-2',
        type: 'blockGroup',
        position: { x: 0, y: 0 },
        data: { level_year: 1, sortOrder: 1, block: { courses: [1, 2] } }
      },
      {
        id: 'block-3',
        type: 'blockGroup',
        position: { x: 0, y: 0 },
        data: { level_year: 1, sortOrder: 2, block: { courses: [1] } }
      }
    ];

    const { nodes: laidOut, hasOverlaps } = await layoutNodes(nodes, []);
    const yearOneNodes = laidOut.filter(n => (n.data as any)?.level_year === 1);
    const yPositions = yearOneNodes.map(n => n.position.y).sort((a, b) => a - b);

    expect(hasOverlaps).toBe(false);
    expect(yPositions.length).toBe(3);
    expect(yPositions[0]).toBeLessThan(yPositions[1]);
    expect(yPositions[1]).toBeLessThan(yPositions[2]);
  });
});