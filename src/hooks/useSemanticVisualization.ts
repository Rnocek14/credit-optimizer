import { useMemo } from 'react';
import { SemanticPath, SemanticNode, SemanticEdge } from '@/types/semantic';
import { EnhancedLearningPath } from '@/hooks/useSemanticPlanning';

export const useSemanticVisualization = (learningPaths: EnhancedLearningPath[]) => {
  const semanticPaths = useMemo((): SemanticPath[] => {
    return learningPaths.map((path, index) => ({
      id: `path-${index}`,
      title: path.target_job || `Learning Path ${index + 1}`,
      nodes: path.steps?.map((step, stepIndex) => ({
        id: step.id || `step-${stepIndex}`,
        title: step.title || step.skill_name || `Step ${stepIndex + 1}`,
        type: step.type === 'job' ? 'job' as const : 
              step.type === 'course' ? 'course' as const : 
              'skill' as const,
        metadata: {
          category: step.category,
          difficulty: step.difficulty,
          xp_value: step.xp_value,
          duration_weeks: step.duration_weeks,
          cost: step.cost,
          personalization_score: path.personalization_score,
          confidence_score: step.confidence,
        },
        substitutions: path.semantic_substitutions || [],
        adaptations: path.adapted_nodes?.find(a => a.node_id === step.id)?.adaptations || [],
        position: { x: stepIndex * 250, y: index * 200 }
      })) || [],
      edges: [], // Would be generated from step relationships
      metadata: {
        personalization_score: path.personalization_score || 0.5,
        time_feasibility: path.time_feasibility || 0.5,
        budget_feasibility: path.budget_feasibility || 0.5,
        location_relevance: path.location_relevance || 0.5,
        total_cost: 0,
        total_duration: 0,
        confidence_score: 0.5,
      },
      pivot_opportunities: []
    }));
  }, [learningPaths]);

  return { semanticPaths };
};