import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  rpcPredictEngagementDecline,
  rpcGenerateAutonomousIntervention,
  rpcUpdateMayaFeedbackModel,
} from '@/shared/lib/api/engagement';

interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high';
  reasons: string[];
  confidence_score: number;
  session_count: number;
  avg_engagement: number;
  engagement_trend: number;
  session_frequency: number;
  analyzed_at: string;
}

interface ModelUpdate {
  updated_feedbacks: number;
  average_engagement_improvement: number;
  model_updates: any[];
  updated_at: string;
}

export function usePredictiveEngagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastRiskAssessment, setLastRiskAssessment] = useState<RiskAssessment | null>(null);
  const [lastModelUpdate, setLastModelUpdate] = useState<ModelUpdate | null>(null);

  const predictEngagementDecline = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const data = await rpcPredictEngagementDecline(userId);
      const riskAssessment = data as unknown as RiskAssessment;
      setLastRiskAssessment(riskAssessment);

      const toastConfig = {
        low: { title: "Engagement Status: Healthy", description: "Learning patterns look good!", variant: "default" as const },
        medium: { title: "Engagement Status: Monitor", description: "Some concerning patterns detected", variant: "default" as const },
        high: { title: "Engagement Status: At Risk", description: "Immediate intervention recommended", variant: "destructive" as const }
      };

      toast(toastConfig[riskAssessment.risk_level]);
      return riskAssessment;
    } catch (error) {
      console.error('Error predicting engagement decline:', error);
      toast({
        title: "Prediction Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const generateAutonomousIntervention = useCallback(async (userId: string, riskAssessment: RiskAssessment) => {
    try {
      const data = await rpcGenerateAutonomousIntervention(userId, riskAssessment);

      if (data) {
        toast({
          title: "Intervention Generated",
          description: `Autonomous intervention created based on ${riskAssessment.risk_level} risk assessment`,
        });
      } else {
        toast({
          title: "No Intervention Needed",
          description: "Risk level is too low to trigger autonomous intervention",
        });
      }

      return data;
    } catch (error) {
      console.error('Error generating autonomous intervention:', error);
      toast({
        title: "Intervention Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const updateMayaFeedbackModel = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const data = await rpcUpdateMayaFeedbackModel(userId);
      const modelUpdate = data as unknown as ModelUpdate;
      setLastModelUpdate(modelUpdate);

      toast({
        title: "Feedback Model Updated",
        description: `Updated ${modelUpdate.updated_feedbacks} feedback correlations`,
      });

      return modelUpdate;
    } catch (error) {
      console.error('Error updating Maya feedback model:', error);
      toast({
        title: "Model Update Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const runFullPredictiveAnalysis = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const riskAssessment = await predictEngagementDecline(userId);
      if (!riskAssessment) return null;

      let interventionId = null;
      if (riskAssessment.risk_level === 'high' || riskAssessment.risk_level === 'medium') {
        interventionId = await generateAutonomousIntervention(userId, riskAssessment);
      }

      const modelUpdate = await updateMayaFeedbackModel(userId);

      return { riskAssessment, interventionId, modelUpdate };
    } catch (error) {
      console.error('Error in full predictive analysis:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [predictEngagementDecline, generateAutonomousIntervention, updateMayaFeedbackModel]);

  const triggerManualPrediction = useCallback(async (userId: string = '2b458624-d498-4cca-a63d-9341cc20e363') => {
    toast({
      title: "Running Predictive Analysis",
      description: "Analyzing engagement patterns and generating recommendations...",
    });

    const result = await runFullPredictiveAnalysis(userId);
    
    if (result) {
      toast({
        title: "Analysis Complete",
        description: `Risk level: ${result.riskAssessment.risk_level} | Confidence: ${Math.round(result.riskAssessment.confidence_score * 100)}%`,
      });
    }

    return result;
  }, [runFullPredictiveAnalysis, toast]);

  return {
    loading,
    lastRiskAssessment,
    lastModelUpdate,
    predictEngagementDecline,
    generateAutonomousIntervention,
    updateMayaFeedbackModel,
    runFullPredictiveAnalysis,
    triggerManualPrediction
  };
}
