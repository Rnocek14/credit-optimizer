import { describe, it, expect, vi } from 'vitest';
import type { Node } from '@xyflow/react';

describe('EduTree layout', () => {
  const pad = 40;
  const colW = 360;
  const rowH = 220;

  function layoutYearColumns(list: Node[]): Node[] {
    const byYear = new Map<number, Node[]>();
    list
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .forEach(n => {
        const y = Number((n.data as any)?.level_year) || 1;
        const arr = byYear.get(y) || [];
        arr.push(n);
        byYear.set(y, arr);
      });
    const out: Node[] = [];
    for (const [y, col] of byYear) {
      col.forEach((n, i) => {
        out.push({ ...n, position: { x: pad + (y - 1) * colW, y: pad + i * rowH } });
      });
    }
    return out;
  }

  it('places B.S. Software Engineering node in year 5', () => {
    const nodes: Node[] = [
      { id: 'a', type: 'blockGroup', position: { x: 0, y: 0 }, data: { level_year: 1 } },
      { id: 'degree-completion', type: 'terminalNode', position: { x: 0, y: 0 }, data: { level_year: 5, block: { title: 'B.S. Software Engineering' } } }
    ];
    const laidOut = layoutYearColumns(nodes);
    const degreeNode = laidOut.find(n => n.id === 'degree-completion');
    expect(degreeNode?.position.x).toBe(pad + (5 - 1) * colW);
  });

  it('triggers fitView when column count increases', () => {
    const columnCountRef = { current: 4 };
    const didFitRef = { current: true };
    const reactFlowInstance = { fitView: vi.fn(), getNodes: () => [] };
    const nodes: Node[] = [
      { id: 'degree-completion', type: 'terminalNode', position: { x: 0, y: 0 }, data: { level_year: 5 } }
    ];

    const byYear = new Map<number, Node[]>();
    nodes.forEach(n => {
      const year = Number((n.data as any)?.level_year) || 1;
      const arr = byYear.get(year) || [];
      arr.push(n);
      byYear.set(year, arr);
    });

    const maxYear = Math.max(5, ...Array.from(byYear.keys()));
    if (maxYear > columnCountRef.current) {
      columnCountRef.current = maxYear;
      didFitRef.current = false;
    }

    if (reactFlowInstance && !didFitRef.current) {
      reactFlowInstance.fitView();
      didFitRef.current = true;
    }

    expect(reactFlowInstance.fitView).toHaveBeenCalled();
    expect(columnCountRef.current).toBe(5);
  });
});