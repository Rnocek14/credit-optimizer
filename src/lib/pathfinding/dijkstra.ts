import { LifePathGraph } from '@/hooks/useLifePathGraph';

// Simple Dijkstra implementation for Phase 0
export function dijkstraPathfinding(
  graph: LifePathGraph, 
  goalId: string, 
  objective: 'time' | 'cost' | 'creditLoss' = 'time'
): string[] {
  const { nodes, edges } = graph;
  
  // Find all nodes that could be starting points (no prerequisites or user-completed prerequisites)
  const startingNodes = nodes.filter(node => 
    node.prerequisiteIds.length === 0 || 
    node.type === 'skill' || 
    node.type === 'certification'
  );

  if (startingNodes.length === 0) {
    return [goalId]; // Fallback: direct path to goal
  }

  // For Phase 0, create a simple path based on node types and objectives
  const pathNodes: string[] = [];
  
  // Start with foundational skills
  const skillNodes = nodes.filter(n => n.type === 'skill');
  if (skillNodes.length > 0) {
    pathNodes.push(skillNodes[0].id);
  }

  // Add courses based on objective
  const courseNodes = nodes.filter(n => n.type === 'course');
  if (courseNodes.length > 0) {
    const sortedCourses = courseNodes.sort((a, b) => {
      if (objective === 'time') return a.estimatedHours - b.estimatedHours;
      if (objective === 'cost') return a.cost - b.cost;
      return (b.credits || 0) - (a.credits || 0); // creditLoss - prefer higher credit courses
    });
    
    pathNodes.push(...sortedCourses.slice(0, 2).map(n => n.id));
  }

  // Add certifications if available
  const certNodes = nodes.filter(n => n.type === 'certification');
  if (certNodes.length > 0) {
    pathNodes.push(certNodes[0].id);
  }

  // Add projects
  const projectNodes = nodes.filter(n => n.type === 'project');
  if (projectNodes.length > 0) {
    pathNodes.push(projectNodes[0].id);
  }

  // End with the goal (job)
  pathNodes.push(goalId);

  return pathNodes;
}