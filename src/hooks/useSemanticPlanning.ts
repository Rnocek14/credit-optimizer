import { useState, useCallback } from 'react';
import { useAIPlanningEngine, LearningPath } from './useAIPlanningEngine';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserContext, 
  SubstitutionOption, 
  PivotOpportunity 
} from '@/lib/semanticLayer';

export interface EnhancedLearningPath extends Omit<LearningPath, 'substitution_options'> {
  personalization_score?: number;
  time_feasibility?: number;
  budget_feasibility?: number;
  location_relevance?: number;
  semantic_substitutions?: SubstitutionOption[];
  adapted_nodes?: any[];
}

export function useSemanticPlanning() {
  const planningEngine = useAIPlanningEngine();
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [pivotOpportunities, setPivotOpportunities] = useState<PivotOpportunity[]>([]);
  const [graphIntegrity, setGraphIntegrity] = useState<any>(null);

  const generateEnhancedPlan = useCallback(async (
    targetJob: string,
    userContext: UserContext = {}
  ): Promise<EnhancedLearningPath[]> => {
    setSemanticLoading(true);
    
    try {
      console.log('🧠 Using Semantic Planning Engine for enhanced planning');
      
      const { data, error: functionError } = await supabase.functions.invoke('semantic-planning-engine', {
        body: {
          operation: 'enhanced_planning',
          target_job: targetJob,
          user_context: userContext
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate enhanced learning plan');
      }

      if (!data.success) {
        throw new Error(data.error || 'Semantic planning engine returned an error');
      }

      console.log(`✨ Generated ${data.paths.length} enhanced learning paths`);
      return data.paths;
      
    } catch (error) {
      console.error('Error in enhanced planning:', error);
      // Fallback to basic planning if semantic engine fails
      console.log('🔄 Falling back to basic planning engine');
      const basePaths = await planningEngine.generateBackwardPlan(targetJob, userContext);
      return basePaths.map(path => ({ ...path, personalization_score: 0.5 }));
    } finally {
      setSemanticLoading(false);
    }
  }, [planningEngine]);

  const findCareerPivots = useCallback(async (
    fromJobId: string,
    userContext: UserContext = {}
  ): Promise<PivotOpportunity[]> => {
    setSemanticLoading(true);
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('semantic-planning-engine', {
        body: {
          operation: 'pivot_analysis',
          current_job_id: fromJobId,
          user_context: userContext
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to analyze pivot opportunities');
      }

      if (!data.success) {
        throw new Error(data.error || 'Pivot analysis returned an error');
      }

      setPivotOpportunities(data.opportunities);
      console.log(`🔄 Found ${data.opportunities.length} pivot opportunities`);
      return data.opportunities;
      
    } catch (error) {
      console.error('Error finding pivot opportunities:', error);
      return [];
    } finally {
      setSemanticLoading(false);
    }
  }, []);

  const validateCareerGraph = useCallback(async () => {
    setSemanticLoading(true);
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('semantic-planning-engine', {
        body: {
          operation: 'graph_validation'
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to validate graph');
      }

      if (!data.success) {
        throw new Error(data.error || 'Graph validation returned an error');
      }

      setGraphIntegrity(data.validation);
      
      console.log('🔍 Graph validation completed:', {
        score: data.validation.validationScore,
        issues: data.validation.totalIssues
      });
      
      return data.validation;
      
    } catch (error) {
      console.error('Error validating graph:', error);
      return null;
    } finally {
      setSemanticLoading(false);
    }
  }, []);

  const findNodeSubstitutions = useCallback(async (
    nodeId: string,
    userContext: UserContext = {}
  ): Promise<SubstitutionOption[]> => {
    try {
      const { data, error: functionError } = await supabase.functions.invoke('semantic-planning-engine', {
        body: {
          operation: 'substitution_discovery',
          node_id: nodeId,
          user_context: userContext
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to find substitutions');
      }

      if (!data.success) {
        throw new Error(data.error || 'Substitution discovery returned an error');
      }

      console.log(`🔄 Found ${data.substitutions.length} substitution options for node ${nodeId}`);
      return data.substitutions;
      
    } catch (error) {
      console.error('Error finding substitutions:', error);
      return [];
    }
  }, []);

  const calculateSkillGap = useCallback(async (
    currentJobId: string,
    targetJobId: string
  ): Promise<{
    overlap_percentage: number;
    missing_skills: string[];
    shared_skills: string[];
    transition_difficulty: number;
  }> => {
    try {
      // TODO: Use semantic engine for detailed skill gap analysis
      const overlap = 0.5; // Placeholder
      const bridgeSkills: string[] = []; // Placeholder
      const sharedSkills: string[] = []; // Placeholder
      
      return {
        overlap_percentage: overlap,
        missing_skills: bridgeSkills,
        shared_skills: sharedSkills,
        transition_difficulty: 1 - overlap // Higher overlap = easier transition
      };
      
    } catch (error) {
      console.error('Error calculating skill gap:', error);
      return {
        overlap_percentage: 0,
        missing_skills: [],
        shared_skills: [],
        transition_difficulty: 1
      };
    }
  }, []);

  return {
    // Enhanced planning methods
    generateEnhancedPlan,
    findCareerPivots,
    findNodeSubstitutions,
    calculateSkillGap,
    validateCareerGraph,
    
    // State
    semanticLoading,
    pivotOpportunities,
    graphIntegrity,
    
    // Base planning engine methods
    ...planningEngine,
    loading: planningEngine.loading || semanticLoading
  };
}