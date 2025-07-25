import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InsightInteraction {
  insight_id: string;
  insight_type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  action_taken: 'clicked' | 'analyzed' | 'set_alert' | 'dismissed' | 'view_salary_analysis' | 'generate_strategy';
  career_path?: string;
  location?: string;
  confidence_score?: number;
  was_helpful?: boolean;
  feedback_rating?: number;
  feedback_notes?: string;
}

export const useInsightTracking = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const trackInsightInteraction = async (interaction: InsightInteraction) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('User not authenticated for insight tracking');
        return;
      }

      const { error } = await supabase
        .from('user_insight_interactions')
        .insert({
          user_id: user.id,
          ...interaction
        });

      if (error) {
        console.error('Error tracking insight interaction:', error);
        return;
      }

      console.log('✅ Insight interaction tracked:', interaction);
    } catch (error) {
      console.error('Failed to track insight interaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateInsightFeedback = async (
    interactionId: string, 
    wasHelpful: boolean, 
    rating?: number, 
    notes?: string
  ) => {
    try {
      const { error } = await supabase
        .from('user_insight_interactions')
        .update({
          was_helpful: wasHelpful,
          feedback_rating: rating,
          feedback_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', interactionId);

      if (error) {
        console.error('Error updating insight feedback:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update insight feedback:', error);
      return false;
    }
  };

  const getInsightPerformance = async (timeframe: string = '30d') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const daysBack = parseInt(timeframe.replace('d', '')) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('user_insight_interactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching insight performance:', error);
        return null;
      }

      // Calculate performance metrics
      const totalInteractions = data.length;
      const helpfulInteractions = data.filter(i => i.was_helpful === true).length;
      const avgRating = data
        .filter(i => i.feedback_rating)
        .reduce((sum, i) => sum + (i.feedback_rating || 0), 0) / 
        data.filter(i => i.feedback_rating).length || 0;

      const actionsByType = data.reduce((acc: Record<string, number>, interaction) => {
        acc[interaction.action_taken] = (acc[interaction.action_taken] || 0) + 1;
        return acc;
      }, {});

      return {
        totalInteractions,
        helpfulInteractions,
        helpfulnessRate: totalInteractions > 0 ? (helpfulInteractions / totalInteractions) * 100 : 0,
        avgRating: Math.round(avgRating * 10) / 10,
        actionsByType,
        data
      };
    } catch (error) {
      console.error('Failed to get insight performance:', error);
      return null;
    }
  };

  return {
    trackInsightInteraction,
    updateInsightFeedback,
    getInsightPerformance,
    loading
  };
};