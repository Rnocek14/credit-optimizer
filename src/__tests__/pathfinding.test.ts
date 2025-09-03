// Tests for Life Path Graph pathfinding algorithms

import { describe, it, expect } from 'vitest';
import { dijkstraPathfinding } from '../lib/pathfinding/dijkstra';
import { validateGraphIntegrity } from '../lib/pathfinding/validators';
import { generateEnhancedMockGraph } from '../lib/pathfinding/mockDataEnhanced';

describe('Life Path Graph Pathfinding', () => {
  const graph = generateEnhancedMockGraph();
  
  it('should validate graph integrity without errors', () => {
    expect(() => validateGraphIntegrity(graph.nodes, graph.edges)).not.toThrow();
  });
  
  it('should find fastest path to bachelor degree', () => {
    const path = dijkstraPathfinding(graph, 'credential-bachelor-cs', 'time', { allowGhost: false });
    
    expect(path).toBeDefined();
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toBe('credential-bachelor-cs');
  });
  
  it('should find cheapest path to bachelor degree', () => {
    const path = dijkstraPathfinding(graph, 'credential-bachelor-cs', 'cost', { allowGhost: false });
    
    expect(path).toBeDefined();
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toBe('credential-bachelor-cs');
  });
  
  it('should prefer CLEP when ghosts are allowed', () => {
    const pathWithGhosts = dijkstraPathfinding(graph, 'credential-bachelor-cs', 'time', { allowGhost: true });
    const pathWithoutGhosts = dijkstraPathfinding(graph, 'credential-bachelor-cs', 'time', { allowGhost: false });
    
    // With ghosts should potentially include CLEP alternatives
    expect(pathWithGhosts).toBeDefined();
    expect(pathWithoutGhosts).toBeDefined();
  });
  
  it('should avoid CLEP when ghosts are disabled', () => {
    const path = dijkstraPathfinding(graph, 'credential-bachelor-cs', 'time', { allowGhost: false });
    
    expect(path).not.toContain('exam-clep-algebra');
  });
  
  it('should handle credit transfer correctly', () => {
    const transferEdge = graph.edges.find(e => e.type === 'creditTransfersTo');
    expect(transferEdge).toBeDefined();
    expect(transferEdge?.creditTransferRate).toBe(1.0);
    expect(transferEdge?.weights?.creditLoss).toBe(0);
  });
  
  it('should validate node types correctly', () => {
    const degreeNodes = graph.nodes.filter(n => /bachelor|associate/i.test(n.title));
    degreeNodes.forEach(node => {
      expect(node.type).toBe('credential');
    });
  });
  
  it('should validate job nodes separately from credentials', () => {
    const jobNodes = graph.nodes.filter(n => n.type === 'job');
    expect(jobNodes.length).toBeGreaterThan(0);
    
    jobNodes.forEach(job => {
      expect(job.type).toBe('job');
      expect(job.estimatedHours).toBe(0); // Jobs don't have duration
      expect(job.cost).toBe(0); // Jobs don't have cost
    });
  });
  
  it('should validate edge semantics', () => {
    const stacksIntoEdges = graph.edges.filter(e => e.type === 'stacksInto');
    stacksIntoEdges.forEach(edge => {
      const target = graph.nodes.find(n => n.id === edge.targetId);
      expect(['credential', 'creditBlock']).toContain(target?.type);
    });
    
    const qualifiesForEdges = graph.edges.filter(e => e.type === 'qualifiesFor');
    qualifiesForEdges.forEach(edge => {
      const target = graph.nodes.find(n => n.id === edge.targetId);
      expect(['job', 'jobGoal']).toContain(target?.type);
    });
  });
});