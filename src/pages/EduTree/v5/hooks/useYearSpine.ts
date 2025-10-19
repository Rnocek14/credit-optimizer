import { useState, useCallback, useMemo } from 'react';
import { Node } from '@xyflow/react';
import { YearSpineNodeData } from '../components/YearSpineNode';

export function useYearSpine() {
  // Collapse state: { 'year-1': true, 'year-2': false, ... }
  const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>({});

  // Toggle year collapse
  const toggleYear = useCallback((yearId: string) => {
    console.log('[useYearSpine] Toggling:', yearId);
    setCollapsedYears(prev => ({
      ...prev,
      [yearId]: !prev[yearId]
    }));
  }, []);

  // Generate year nodes
  const yearNodes = useMemo((): Node<YearSpineNodeData>[] => {
    const years = [
      { id: 'year-1', label: 'Year 1', year: 1, x: 0 },
      { id: 'year-2', label: 'Year 2', year: 2, x: 400 },
      { id: 'year-3', label: 'Year 3', year: 3, x: 800 },
      { id: 'year-4', label: 'Year 4', year: 4, x: 1200 },
    ];

    return years.map(y => ({
      id: y.id,
      type: 'yearSpine',
      position: { x: y.x, y: 100 }, // All at same Y (horizontal spine)
      data: {
        label: y.label,
        year: y.year,
        isCollapsed: !!collapsedYears[y.id],
        onClick: () => toggleYear(y.id),
        creditsSummary: {
          planned: 30,
          required: 30
        }
      },
      draggable: false,
      selectable: true
    }));
  }, [collapsedYears]);

  return {
    yearNodes,
    toggleYear,
    collapsedYears
  };
}
