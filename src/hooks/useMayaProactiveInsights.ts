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
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInsights = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Debug logging for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Maya] fetchInsights (view) query params', {
          userId,
          source: 'maya_visible_insights', // canonical view
        });
      }

      // Use direct table query first as fallback, then try view
      const { data, error: fetchError } = await supabase
        .from('maya_proactive_insights')
        .select('*')
        .eq('user_id', userId)
        .is('dismissed_at', null)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInsights(data || []);
      setLastFetchedAt(new Date().toISOString());

      // Debug logging for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Maya] fetchInsights (view) result', data?.length, data?.slice(0, 3));
      }

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
        // Avoid potential read-after-write lag
        await new Promise((r) => setTimeout(r, 150));
        await fetchInsights(); // Refresh insights after generation
        if (!silent) {
          const inserted =
            data?.performance?.inserted_count ?? data?.insightsInserted ?? data?.generatedCount ?? 0;
          const parsed = data?.performance?.parsed_count ?? data?.parsedCount ?? 0;
          toast({
            title: "Maya insights updated!",
            description: `Inserted ${inserted} insights (parsed ${parsed})`,
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

  const undismissInsight = useCallback(async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('maya_proactive_insights')
        .update({ dismissed_at: null })
        .eq('id', insightId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (err) {
      console.error('Error undismissing insight:', err);
      throw err;
    }
  }, [userId]);

  const provideFeedback = useCallback(async (insightId: string, rating: number, feedback?: string) => {
    try {
      // First get the current context_data
      const { data: existing } = await supabase
        .from('maya_proactive_insights')
        .select('id, context_data')
        .eq('id', insightId)
        .single();

      // Merge feedback into context_data
      const nextContextData = {
        ...(existing?.context_data && typeof existing.context_data === 'object' ? existing.context_data : {}),
        feedback_text: feedback,
      };

      const { error } = await supabase
        .from('maya_proactive_insights')
        .update({ 
          feedback_rating: rating,
          context_data: nextContextData,
          feedback_at: new Date().toISOString()
        })
        .eq('id', insightId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setInsights(prev => prev.map(insight =>
        insight.id === insightId
          ? { 
              ...insight, 
              feedback_rating: rating,
              context_data: nextContextData,
              feedback_at: new Date().toISOString()
            }
          : insight
      ));

      toast({
        title: "Feedback recorded",
        description: "Thanks for helping Maya improve!",
        duration: 3000,
      });
    } catch (err) {
      console.error('Error providing feedback:', err);
      toast({
        title: "Feedback failed",
        description: "Could not save your feedback. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [userId, toast]);

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
    undismissInsight,
    markAsActedUpon,
    provideFeedback,
    lastGenerated: insights.length > 0 ? insights[0].created_at : null,
    lastFetchedAt,
  };
}
