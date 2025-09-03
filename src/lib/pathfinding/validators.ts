// Validators for Life Path Graph data integrity

import { GraphNode, GraphEdge } from '@/types/lifePathGraph';

export function validateNodeTypes(nodes: GraphNode[]): void {
  for (const node of nodes) {
    const isDegree = /degree|bachelor|associate|certificate/i.test(node.title || '');
    if (isDegree && node.type !== 'credential') {
      throw new Error(`Node "${node.title}" must be type "credential", got "${node.type}"`);
    }
    
    const isJob = /nurse|analyst|engineer|developer|manager|architect|scientist/i.test(node.title || '');
    if (isJob && !(node.type === 'job' || node.type === 'jobGoal')) {
      console.warn(`Node "${node.title}" looks like a job; check type.`);
    }
    
    // Validate credential nodes have proper level
    if (node.type === 'credential' && !node.level) {
      console.warn(`Credential node "${node.title}" should have a level (bachelor, associate, etc.)`);
    }
    
    // Validate credit blocks have rule metadata
    if (node.type === 'creditBlock' && !node.metadata?.rule) {
      console.warn(`Credit block "${node.title}" should have a rule in metadata`);
    }
  }
}

export function validateEdges(edges: GraphEdge[], getNode: (id: string) => GraphNode | undefined): void {
  for (const edge of edges) {
    const source = getNode(edge.sourceId);
    const target = getNode(edge.targetId);
    
    if (!source || !target) {
      throw new Error(`Invalid edge: missing nodes for ${edge.id}`);
    }
    
    // stacksInto must target credential or creditBlock
    if (edge.type === 'stacksInto' && !(target.type === 'credential' || target.type === 'creditBlock')) {
      throw new Error(`stacksInto must target a credential/creditBlock: ${source.title} -> ${target.title}`);
    }
    
    // creditTransfersTo should be between different institutions
    if (edge.type === 'creditTransfersTo') {
      if (source.type === target.type && source.institutionId === target.institutionId) {
        console.warn(`creditTransfersTo within same institution? Check mapping: ${source.title} -> ${target.title}`);
      }
      if (!edge.policy) {
        console.warn(`creditTransfersTo edge should have policy: ${source.title} -> ${target.title}`);
      }
    }
    
    // buildsSkill should target skill nodes
    if (edge.type === 'buildsSkill' && target.type !== 'skill') {
      console.warn(`buildsSkill should target skill node: ${source.title} -> ${target.title}`);
    }
    
    // qualifiesFor should target job nodes
    if (edge.type === 'qualifiesFor' && !(target.type === 'job' || target.type === 'jobGoal')) {
      console.warn(`qualifiesFor should target job/jobGoal: ${source.title} -> ${target.title}`);
    }
  }
}

export function validateGraphIntegrity(nodes: GraphNode[], edges: GraphEdge[]): void {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const getNode = (id: string) => nodeMap.get(id);
  
  // Run all validations
  validateNodeTypes(nodes);
  validateEdges(edges, getNode);
  
  // Check for orphaned nodes
  const connectedNodes = new Set();
  edges.forEach(e => {
    connectedNodes.add(e.sourceId);
    connectedNodes.add(e.targetId);
  });
  
  const orphanNodes = nodes.filter(n => !connectedNodes.has(n.id));
  if (orphanNodes.length > 0) {
    console.info(`Found ${orphanNodes.length} orphan nodes:`, orphanNodes.map(n => n.title));
  }
  
  console.log('✅ Graph validation completed');
}