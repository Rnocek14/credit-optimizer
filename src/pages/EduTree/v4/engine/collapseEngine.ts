/**
 * Collapse Engine - Utilities for hierarchical node visibility
 * Phase 2S: Infrastructure for collapsible year/module/degree nodes
 */
import { PlanNode, NodeType } from '../types/v4';
import { Node } from '@xyflow/react';

export interface CollapseState {
  collapsedYears: Set<number>;
  collapsedModules: Set<string>;
  isDegreeCollapsed: boolean;
}

/**
 * Determine which nodes should be visible given current collapse state
 */
export function filterVisibleNodes(
  nodes: PlanNode[],
  state: CollapseState
): PlanNode[] {
  const { collapsedYears, collapsedModules, isDegreeCollapsed } = state;
  
  // If degree collapsed, show only degree node
  if (isDegreeCollapsed) {
    return nodes.filter(n => n.type === 'degree' as any);
  }
  
  return nodes.filter(node => {
    // Always show year nodes (spine stays visible)
    if (node.type === NodeType.Year) return true;
    
    // Hide module cards if their year is collapsed
    if (node.type === NodeType.ModuleGroup) {
      const year = node.data.yearFilter;
      if (year && collapsedYears.has(year)) return false;
      
      // Hide if module itself is collapsed (future: show compact version)
      // For now, keep module card visible but mark as collapsed for internal rendering
      return true;
    }
    
    // Hide all other nodes (courses, placeholders) - not rendered in Phase 2I anyway
    return false;
  });
}

/**
 * Calculate summary badge for collapsed year nodes
 */
export function getCollapsedYearSummary(
  year: number,
  nodes: PlanNode[]
): { moduleCount: number; completedModules: number; totalCredits: number } {
  const yearModules = nodes.filter(
    n => n.type === NodeType.ModuleGroup && n.data.yearFilter === year
  );
  
  const completedModules = yearModules.filter(n => {
    const earned = (n.data as any).creditsEarned || 0;
    const required = (n.data as any).creditsRequired || 0;
    return required > 0 && earned === required;
  }).length;
  
  const totalCredits = yearModules.reduce(
    (sum, n) => sum + ((n.data as any).creditsRequired || 0),
    0
  );
  
  return {
    moduleCount: yearModules.length,
    completedModules,
    totalCredits,
  };
}

/**
 * Determine if edges should be visible based on source/target node visibility
 */
export function filterVisibleEdges(
  edges: any[],
  visibleNodeIds: Set<string>
): any[] {
  return edges.map(edge => {
    const sourceVisible = visibleNodeIds.has(edge.source);
    const targetVisible = visibleNodeIds.has(edge.target);
    
    // Hide edge if either endpoint is hidden
    const shouldHide = !sourceVisible || !targetVisible;
    
    return {
      ...edge,
      hidden: shouldHide || edge.hidden, // Preserve existing hidden state
    };
  });
}
