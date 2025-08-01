import { useMemo } from 'react';
import { SemanticPath, SemanticNode, SemanticEdge, SubstitutionOption } from '@/types/semantic';
import { EnhancedLearningPath } from '@/hooks/useSemanticPlanning';

export const useSemanticVisualization = (learningPaths: EnhancedLearningPath[]) => {
  const semanticPaths = useMemo((): SemanticPath[] => {
    return learningPaths.map((path, index) => {
      const pathNodes = path.nodes?.map((node, nodeIndex) => ({
        id: node.id || `node-${index}-${nodeIndex}`,
        title: node.title || `Node ${nodeIndex + 1}`,
        type: node.type === 'job' ? 'job' as const : 
              node.type === 'course' ? 'course' as const : 
              'skill' as const,
        metadata: {
          difficulty: node.difficulty_level,
          cost: node.cost_estimate,
          duration_weeks: Math.ceil((node.estimated_time_hours || 0) / 40),
          personalization_score: path.personalization_score,
          confidence_score: path.confidence_score,
        },
        substitutions: [],
        adaptations: [],
        position: { x: nodeIndex * 300, y: index * 250 }
      })) || [];

      // Generate sequential edges connecting nodes in learning order
      const pathEdges: SemanticEdge[] = [];
      for (let i = 0; i < pathNodes.length - 1; i++) {
        const currentNode = pathNodes[i];
        const nextNode = pathNodes[i + 1];
        
        pathEdges.push({
          id: `edge-${currentNode.id}-${nextNode.id}`,
          source: currentNode.id,
          target: nextNode.id,
          type: currentNode.type === 'skill' && nextNode.type === 'course' ? 'leads_to' :
                currentNode.type === 'course' && nextNode.type === 'skill' ? 'leads_to' :
                nextNode.type === 'job' ? 'prerequisite' : 'leads_to',
          metadata: {
            strength: 0.8,
            confidence: path.confidence_score || 0.7,
            skill_overlap: 0.75,
            transition_difficulty: currentNode.metadata.difficulty || 3,
          }
        });
      }

      return {
        id: path.id || `path-${index}`,
        title: `Learning Path ${index + 1}`,
        nodes: pathNodes,
        edges: pathEdges,
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
      };
    });
  }, [learningPaths]);

  return { semanticPaths };
};