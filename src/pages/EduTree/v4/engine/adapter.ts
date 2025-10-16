/**
 * V3 → V4 Adapter
 * Transforms V3-style JSON to V4 graph format
 */

import { PlanNode, PlanEdge, NodeType, EdgeType, V4GraphData } from '../types/v4';

interface V3Course {
  id: string;
  code: string;
  credits: number;
  year?: number;
  status?: 'completed' | 'in-progress' | 'planned';
  prereqs?: string[];
  source?: 'institution' | 'transfer' | 'exam';
}

interface V3Data {
  courses?: V3Course[];
  years?: { id: string; label: string }[];
  equivalents?: { externalId: string; internalId: string }[];
}

export function adaptV3ToV4(v3Data: V3Data): V4GraphData {
  const nodes: PlanNode[] = [];
  const edges: PlanEdge[] = [];
  
  // Add year nodes if provided
  v3Data.years?.forEach((year, index) => {
    nodes.push({
      id: year.id,
      type: NodeType.Year,
      data: { label: year.label },
      position: { x: index * 400, y: 0 },
      className: 'spine-node'
    });
    
    // Sequence edges between years
    if (index > 0 && v3Data.years) {
      edges.push({
        id: `seq-${v3Data.years[index - 1].id}-${year.id}`,
        source: v3Data.years[index - 1].id,
        target: year.id,
        type: EdgeType.Sequence,
        className: 'spine-edge'
      });
    }
  });
  
  // Transform courses → course nodes
  v3Data.courses?.forEach(course => {
    const isExternal = course.source === 'transfer' || course.source === 'exam';
    
    nodes.push({
      id: course.id,
      type: isExternal ? NodeType.External : NodeType.Course,
      data: {
        label: course.code,
        credits: course.credits,
        status: course.status || 'planned',
        source: course.source,
        year: course.year,
        transferable: !!v3Data.equivalents?.some(eq => eq.internalId === course.id)
      },
      position: { x: 0, y: 0 }, // Will be positioned by layout engine
      className: isExternal ? 'external-node' : 'course-node'
    });
    
    // Transform prereqs → prerequisite edges
    course.prereqs?.forEach(prereqId => {
      edges.push({
        id: `prereq-${prereqId}-${course.id}`,
        source: prereqId,
        target: course.id,
        type: EdgeType.Prerequisite,
        className: 'prereq-edge'
      });
    });
  });
  
  // Transform equivalents → equivalency edges
  v3Data.equivalents?.forEach(({ externalId, internalId }) => {
    edges.push({
      id: `equiv-${externalId}-${internalId}`,
      source: externalId,
      target: internalId,
      type: EdgeType.Equivalency,
      className: 'equiv-edge hidden',
      hidden: true
    });
  });
  
  return { nodes, edges };
}
