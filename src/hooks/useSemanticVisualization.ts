import { useMemo } from 'react';
import { SemanticPath, SemanticNode, SemanticEdge, SubstitutionOption } from '@/types/semantic';
import { EnhancedLearningPath } from '@/hooks/useSemanticPlanning';

export const useSemanticVisualization = (learningPaths: EnhancedLearningPath[]) => {
  const semanticPaths = useMemo((): SemanticPath[] => {
    return learningPaths.map((path, index) => ({
      id: path.id || `path-${index}`,
      title: `Learning Path ${index + 1}`,
      nodes: path.nodes?.map((node, nodeIndex) => ({
        id: node.id || `node-${nodeIndex}`,
        title: node.title || `Node ${nodeIndex + 1}`,
        type: node.type === 'job' ? 'job' as const : 
              node.type === 'course' ? 'course' as const : 
              'skill' as const,
        metadata: {
          difficulty: node.difficulty_level,
          cost: node.cost_estimate,
          duration_weeks: Math.ceil((node.estimated_time_hours || 0) / 40), // Convert hours to weeks
          personalization_score: path.personalization_score,
          confidence_score: path.confidence_score,
        },
        substitutions: [], // TODO: Map semantic substitutions properly
        adaptations: [], // TODO: Map adapted nodes properly
        position: { x: nodeIndex * 250, y: index * 200 }
      })) || [],
      edges: [], // Would be generated from node relationships
      metadata: {
        personalization_score: path.personalization_score || 0.5,
        time_feasibility: path.time_feasibility || 0.5,
        budget_feasibility: path.budget_feasibility || 0.5,
        location_relevance: path.location_relevance || 0.5,
        total_cost: path.total_cost || 0,
        total_duration: path.total_time || 0,
        confidence_score: path.confidence_score || 0.5,
      },
      pivot_opportunities: []
    }));
  }, [learningPaths]);

  return { semanticPaths };
};