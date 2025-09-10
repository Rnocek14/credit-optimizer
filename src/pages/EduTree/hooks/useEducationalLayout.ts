import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';

interface EducationalLayoutOptions {
  focusMode?: string;
  viewMode?: 'flow' | 'board';
  enableSmoothing?: boolean;
}

/**
 * Hook for calculating educational flow-based layout positions
 * Provides consistent spacing and natural progression visualization
 */
export function useEducationalLayout(
  nodes: Node[],
  edges: Edge[],
  options: EducationalLayoutOptions = {}
) {
  const { focusMode = 'overview', viewMode = 'flow', enableSmoothing = true } = options;

  const layoutNodes = useMemo(() => {
    if (viewMode === 'board') {
      // Board mode: Grid layout with consistent spacing
      return nodes.map((node, index) => ({
        ...node,
        position: {
          x: (index % 3) * 400,
          y: Math.floor(index / 3) * 300
        }
      }));
    }

    // Flow mode: Educational progression layout
    const coreNodes = nodes.filter(n => n.type === 'blockGroup');
    const transitionNodes = nodes.filter(n => n.type === 'transitionBlock');
    const trackNodes = nodes.filter(n => n.type === 'specializationTrack');

    // Calculate year-based positioning for core blocks
    const yearGroups = coreNodes.reduce((acc, node) => {
      const year = (node.data?.level_year as number) || 1;
      if (!acc[year]) acc[year] = [];
      acc[year].push(node);
      return acc;
    }, {} as Record<number, Node[]>);

    let layoutResult = [...nodes];

    // Position core blocks with consistent year-based layout
    Object.entries(yearGroups).forEach(([yearStr, yearNodes]) => {
      const year = parseInt(yearStr);
      const baseX = year * 450;
      yearNodes.forEach((node, index) => {
        const nodeIndex = layoutResult.findIndex(n => n.id === node.id);
        if (nodeIndex >= 0) {
          layoutResult[nodeIndex] = {
            ...layoutResult[nodeIndex],
            position: {
              x: baseX,
              y: index * 220 + 100 // Start offset from top
            }
          };
        }
      });
    });

    // Apply focus mode transformations
    if (focusMode === 'web-track') {
      layoutResult = layoutResult.map(node => {
        if (node.id === 'mobile-track') {
          return {
            ...node,
            position: {
              ...node.position,
              y: node.position.y + 400 // Push mobile track down when focusing web
            }
          };
        }
        return node;
      });
    }

    if (focusMode === 'mobile-track') {
      layoutResult = layoutResult.map(node => {
        if (node.id === 'web-track') {
          return {
            ...node,
            position: {
              ...node.position,
              y: node.position.y - 400 // Push web track up when focusing mobile
            }
          };
        }
        return node;
      });
    }

    return layoutResult;
  }, [nodes, viewMode, focusMode]);

  return {
    nodes: layoutNodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      coreBlocks: nodes.filter(n => n.type === 'blockGroup').length,
      tracks: nodes.filter(n => n.type === 'specializationTrack').length
    }
  };
}