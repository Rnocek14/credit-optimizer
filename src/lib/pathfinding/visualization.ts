// Visualization helpers for Life Path Graph

import { EdgeType } from '@/types/lifePathGraph';

export interface EdgeStyle {
  kind: 'straight' | 'curve' | 'orthogonal' | 'thin';
  thickness: number;
  color: string;
  dash?: number[];
  opacity?: number;
}

export function styleEdge(edgeType: EdgeType, isHighlighted = false, isGhost = false): EdgeStyle {
  let style: EdgeStyle;
  
  switch (edgeType) {
    case 'creditTransfersTo':
      style = {
        kind: 'curve',
        thickness: 4,
        color: 'hsl(var(--primary))',
      };
      break;
      
    case 'equivalentTo':
      style = {
        kind: 'curve',
        thickness: 2,
        color: 'hsl(var(--secondary))',
        dash: [6, 4],
      };
      break;
      
    case 'stacksInto':
      style = {
        kind: 'straight',
        thickness: 2,
        color: 'hsl(var(--accent))',
      };
      break;
      
    case 'requires':
      style = {
        kind: 'orthogonal',
        thickness: 2,
        color: 'hsl(var(--muted-foreground))',
      };
      break;
      
    case 'buildsSkill':
      style = {
        kind: 'straight',
        thickness: 1,
        color: 'hsl(var(--muted-foreground) / 0.7)',
      };
      break;
      
    case 'qualifiesFor':
      style = {
        kind: 'straight',
        thickness: 3,
        color: 'hsl(var(--destructive))',
      };
      break;
      
    default:
      style = {
        kind: 'thin',
        thickness: 1,
        color: 'hsl(var(--muted-foreground) / 0.5)',
      };
  }
  
  // Apply highlighting
  if (isHighlighted) {
    style.thickness *= 1.5;
    style.opacity = 1;
  } else {
    style.opacity = 0.6;
  }
  
  // Apply ghost styling
  if (isGhost) {
    style.dash = [5, 5];
    style.opacity = 0.4;
    style.color = 'hsl(var(--muted-foreground) / 0.4)';
  }
  
  return style;
}

export function getNodeColorByType(nodeType: string): string {
  switch (nodeType) {
    case 'skill':
      return 'hsl(var(--primary) / 0.1)';
    case 'course':
      return 'hsl(var(--secondary) / 0.1)';
    case 'credential':
      return 'hsl(var(--accent) / 0.1)';
    case 'job':
    case 'jobGoal':
      return 'hsl(var(--destructive) / 0.1)';
    case 'certification':
      return 'hsl(var(--warning) / 0.1)';
    case 'exam':
      return 'hsl(var(--info) / 0.1)';
    case 'project':
      return 'hsl(var(--success) / 0.1)';
    case 'creditBlock':
      return 'hsl(var(--muted) / 0.2)';
    default:
      return 'hsl(var(--background))';
  }
}

export function getNodeBorderColorByType(nodeType: string): string {
  switch (nodeType) {
    case 'skill':
      return 'hsl(var(--primary))';
    case 'course':
      return 'hsl(var(--secondary))';
    case 'credential':
      return 'hsl(var(--accent))';
    case 'job':
    case 'jobGoal':
      return 'hsl(var(--destructive))';
    case 'certification':
      return 'hsl(var(--warning))';
    case 'exam':
      return 'hsl(var(--info))';
    case 'project':
      return 'hsl(var(--success))';
    case 'creditBlock':
      return 'hsl(var(--muted-foreground))';
    default:
      return 'hsl(var(--border))';
  }
}

export function calculateNodePosition(
  nodeIndex: number, 
  depth: number, 
  institutionLane: number = 0
): { x: number; y: number } {
  const depthSpacing = 400;
  const laneSpacing = 300;
  const nodeSpacing = 150;
  
  return {
    x: depth * depthSpacing + institutionLane * laneSpacing,
    y: nodeIndex * nodeSpacing + 100,
  };
}

export function formatTransferRate(creditLoss: number, totalCredits: number): string {
  if (creditLoss === 0) return '100% transfer';
  
  const transferRate = Math.round(((totalCredits - creditLoss) / totalCredits) * 100);
  return `${transferRate}% transfer`;
}

export function formatPathMetrics(metrics: {
  totalTime: number;
  totalCost: number;
  totalCredits: number;
  creditLoss: number;
  institutionsCount: number;
  prerequisitesSatisfied: number;
}): string {
  return [
    `${metrics.totalTime}mo`,
    `$${(metrics.totalCost / 1000).toFixed(0)}k`,
    `${metrics.totalCredits - metrics.creditLoss}/${metrics.totalCredits} credits`,
    `${metrics.prerequisitesSatisfied} prereqs`,
    `${metrics.institutionsCount} institutions`,
  ].join(' • ');
}

// Visual V2 - Edge and Node Tiering
export type EdgeTier = 'on-path' | 'related' | 'off-path';
export type NodeTier = 'on-path' | 'related' | 'off-path';

export function determineEdgeTier(
  edgeId: string,
  activePathNodeIds: string[],
  allNodes: any[],
  allEdges: any[]
): EdgeTier {
  const edge = allEdges.find(e => e.id === edgeId);
  if (!edge) return 'off-path';
  
  const sourceInPath = activePathNodeIds.includes(edge.sourceId);
  const targetInPath = activePathNodeIds.includes(edge.targetId);
  
  // On-path: both nodes are in the active path
  if (sourceInPath && targetInPath) return 'on-path';
  
  // Related: touches at least one node in the active path
  if (sourceInPath || targetInPath) return 'related';
  
  return 'off-path';
}

export function determineNodeTier(
  nodeId: string,
  activePathNodeIds: string[],
  allEdges: any[]
): NodeTier {
  // On-path: node is in the active path
  if (activePathNodeIds.includes(nodeId)) return 'on-path';
  
  // Related: node connects to any node in the active path
  const isRelated = allEdges.some(edge => {
    const connectsToPath = activePathNodeIds.includes(edge.sourceId) || activePathNodeIds.includes(edge.targetId);
    const touchesThisNode = edge.sourceId === nodeId || edge.targetId === nodeId;
    return connectsToPath && touchesThisNode;
  });
  
  if (isRelated) return 'related';
  
  return 'off-path';
}