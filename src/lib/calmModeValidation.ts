// Calm Mode Data Validation
// Comprehensive validation for calm mode data integrity

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCalmModeData(nodes: any[], edges: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic type validation
  if (!Array.isArray(nodes)) {
    errors.push('Nodes must be an array');
  }

  if (!Array.isArray(edges)) {
    errors.push('Edges must be an array');
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Node structure validation
  const validNodeIds = new Set<string>();
  nodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') {
      errors.push(`Node at index ${index} is not an object`);
      return;
    }

    if (!node.id || typeof node.id !== 'string') {
      errors.push(`Node at index ${index} missing valid id`);
      return;
    }

    if (!node.type || typeof node.type !== 'string') {
      errors.push(`Node ${node.id} missing valid type`);
    }

    if (!node.title || typeof node.title !== 'string') {
      errors.push(`Node ${node.id} missing valid title`);
    }

    // Check for required calm mode properties
    if (!['skill', 'course', 'project', 'certification', 'job', 'step'].includes(node.type)) {
      warnings.push(`Node ${node.id} has unsupported type: ${node.type}`);
    }

    validNodeIds.add(node.id);
  });

  // Edge structure validation
  edges.forEach((edge, index) => {
    if (!edge || typeof edge !== 'object') {
      errors.push(`Edge at index ${index} is not an object`);
      return;
    }

    // Handle both data formats
    const source = edge.source || edge.from_id;
    const target = edge.target || edge.to_id;

    if (!source || typeof source !== 'string') {
      errors.push(`Edge at index ${index} missing valid source/from_id`);
      return;
    }

    if (!target || typeof target !== 'string') {
      errors.push(`Edge at index ${index} missing valid target/to_id`);
      return;
    }

    // Validate that referenced nodes exist
    if (!validNodeIds.has(source)) {
      errors.push(`Edge at index ${index} references non-existent source node: ${source}`);
    }

    if (!validNodeIds.has(target)) {
      errors.push(`Edge at index ${index} references non-existent target node: ${target}`);
    }

    // Check for edge ID
    if (!edge.id) {
      warnings.push(`Edge at index ${index} missing id property`);
    }
  });

  // Additional calm mode specific validations
  if (nodes.length === 0) {
    warnings.push('No nodes provided - calm mode will show empty state');
  }

  if (nodes.length > 1000) {
    warnings.push(`Large dataset (${nodes.length} nodes) - performance may be impacted`);
  }

  if (edges.length > 2000) {
    warnings.push(`Large edge set (${edges.length} edges) - layout complexity may increase`);
  }

  // Check for disconnected components
  const connectedNodes = new Set<string>();
  edges.forEach(edge => {
    const source = edge.source || edge.from_id;
    const target = edge.target || edge.to_id;
    if (source && target) {
      connectedNodes.add(source);
      connectedNodes.add(target);
    }
  });

  const isolatedNodes = nodes.filter(node => !connectedNodes.has(node.id));
  if (isolatedNodes.length > 0) {
    warnings.push(`${isolatedNodes.length} isolated nodes found - they will appear in orphan parking lot`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}