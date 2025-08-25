import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProactiveInsight {
  id: string;
  title: string;
  content: string;
  insight_type: string;
  category: string;
  priority: string;
  confidence_score: number;
  context_data: any;
  expires_at: string;
  created_at: string;
  dismissed_at?: string;
  acted_upon_at?: string;
}

export function useMayaProactiveInsights(userId?: string) {
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInsights = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('maya_proactive_insights')
        .select('*')
        .eq('user_id', userId)
        .is('dismissed_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInsights(data || []);

      // Show urgent insights as toast notifications
      const urgentInsights = data?.filter(
        insight => insight.priority === 'urgent' && !insight.dismissed_at
      ) || [];

      urgentInsights.forEach(insight => {
        toast({
          title: `🔥 ${insight.title}`,
          description: insight.content.substring(0, 100) + '...',
          duration: 8000,
        });
      });

    } catch (err) {
      console.error('Error fetching Maya insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  const generateInsights = useCallback(async (insightType: string = 'daily', silent: boolean = false) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.functions.invoke('maya-manual-insights', {
        body: { userId, insightType }
      });

      if (error) throw error;

      if (data?.success) {
        await fetchInsights(); // Refresh insights after generation
        if (!silent) {
          toast({
            title: "Maya insights updated!",
            description: `Generated ${data.insights?.length || 1} new personalized insights`,
            duration: 5000,
          });
        }
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      if (!silent) {
        toast({
          title: "Insight generation failed",
          description: "Using previous insights for now",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  }, [userId, fetchInsights, toast]);

  const dismissInsight = useCallback(async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('maya_proactive_insights')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', insightId)
        .eq('user_id', userId);

      if (error) throw error;

      setInsights(prev => prev.filter(insight => insight.id !== insightId));
    } catch (err) {
      console.error('Error dismissing insight:', err);
    }
  }, [userId]);

  const markAsActedUpon = useCallback(async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('maya_proactive_insights')
        .update({ acted_upon_at: new Date().toISOString() })
        .eq('id', insightId)
        .eq('user_id', userId);

      if (error) throw error;

      setInsights(prev => 
        prev.map(insight => 
          insight.id === insightId 
            ? { ...insight, acted_upon_at: new Date().toISOString() }
            : insight
        )
      );
    } catch (err) {
      console.error('Error marking insight as acted upon:', err);
    }
  }, [userId]);

  const provideFeedback = useCallback(async (insightId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('maya_proactive_insights')
        .update({ feedback_rating: rating })
        .eq('id', insightId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (err) {
      console.error('Error providing feedback:', err);
    }
  }, [userId]);

  // Auto-refresh insights periodically
  useEffect(() => {
    if (userId) {
      fetchInsights();
      
      const interval = setInterval(fetchInsights, 5 * 60 * 1000); // Every 5 minutes
      return () => clearInterval(interval);
    }
  }, [userId, fetchInsights]);

  // Listen to real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('maya-insights')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'maya_proactive_insights',
          filter: `user_id=eq.${userId}`
        }, 
        () => {
          fetchInsights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchInsights]);

  return {
    insights,
    loading,
    error,
    fetchInsights,
    generateInsights,
    dismissInsight,
    markAsActedUpon,
    provideFeedback
  };
}