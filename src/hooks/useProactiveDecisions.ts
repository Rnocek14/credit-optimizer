import { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedMaya } from './useEnhancedMaya';

interface ProactiveDecision {
  id: string;
  type: 'career_pivot' | 'skill_investment' | 'learning_focus' | 'market_timing' | 'goal_adjustment';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  timeWindow: string;
  options: DecisionOption[];
  contextFactors: string[];
  consequences: Record<string, string>;
}

interface DecisionOption {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  riskLevel: 'low' | 'medium' | 'high';
  expectedOutcome: {
    careerImpact: number;
    timeInvestment: string;
    successProbability: number;
  };
}

export function useProactiveDecisions() {
  const [decisions, setDecisions] = useState<ProactiveDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  // Request management
  const isGenerating = useRef(false);
  const requestCount = useRef(0);
  const lastRequestTime = useRef(0);
  
  const { sendEnhancedRequest } = useEnhancedMaya();

  const generateProactiveDecisions = useCallback(async () => {
    // Prevent concurrent requests
    if (isGenerating.current) {
      console.log('⏳ Decision generation already in progress, skipping...');
      return;
    }

    // Rate limiting: max 2 requests per minute
    const now = Date.now();
    if (now - lastRequestTime.current < 30000 && requestCount.current >= 2) {
      console.warn('🚫 Rate limit reached for decision generation');
      return;
    }

    isGenerating.current = true;
    setLoading(true);
    setError(null);
    requestCount.current++;
    lastRequestTime.current = now;
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Try to get real AI-generated decisions from maya_decisions table
      const { data: existingDecisions, error: dbError } = await supabase
        .from('career_monitoring_alerts')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!dbError && existingDecisions && existingDecisions.length > 0) {
        // Transform alerts into proactive decisions
        const realDecisions: ProactiveDecision[] = existingDecisions.map(alert => ({
          id: alert.id,
          type: 'market_timing' as const,
          title: alert.title,
          description: alert.description,
          urgency: alert.severity as 'low' | 'medium' | 'high',
          confidence: 0.85,
          timeWindow: '1-2 weeks',
          options: (alert.recommended_actions as any[])?.map((action, idx) => ({
            id: `opt-${idx}`,
            title: action.title || 'Take Action',
            description: action.description || '',
            pros: ['Addresses the alert'],
            cons: ['Requires time investment'],
            riskLevel: 'medium' as const,
            expectedOutcome: {
              careerImpact: 0.6,
              timeInvestment: '2-3 weeks',
              successProbability: 0.75
            }
          })) || [],
          contextFactors: ['real_market_data', 'user_profile_analysis'],
          consequences: {
            immediate: 'Action required',
            '1month': 'Improved positioning',
            '3months': 'Better opportunities'
          }
        }));

        setDecisions(realDecisions);
        setIsUsingMockData(false);
        setLastRefreshed(new Date());
        return;
      }

      // Fallback to mock decisions if no real data
      const mockDecisions: ProactiveDecision[] = [
        {
          id: 'dec-001',
          type: 'skill_investment',
          title: 'Should you prioritize AI/ML skills now?',
          description: 'Market trends suggest AI skills will become critical in your field within 12 months.',
          urgency: 'high',
          confidence: 0.89,
          timeWindow: '2-3 months decision window',
          options: [
            {
              id: 'opt-1',
              title: 'Invest in AI/ML immediately',
              description: 'Start comprehensive AI/ML learning path',
              pros: ['Early mover advantage', 'Higher salary potential', 'Future-proof skills'],
              cons: ['Time investment', 'Learning curve', 'Current projects may suffer'],
              riskLevel: 'medium',
              expectedOutcome: {
                careerImpact: 0.75,
                timeInvestment: '6-8 months',
                successProbability: 0.82
              }
            },
            {
              id: 'opt-2',
              title: 'Wait and specialize later',
              description: 'Focus on current expertise, pivot when market demands',
              pros: ['Maintain current momentum', 'Less immediate pressure', 'Proven skills'],
              cons: ['Miss early opportunities', 'Playing catch-up', 'Lower positioning'],
              riskLevel: 'high',
              expectedOutcome: {
                careerImpact: 0.35,
                timeInvestment: '12+ months',
                successProbability: 0.65
              }
            }
          ],
          contextFactors: ['AI adoption acceleration', 'Competitor skill gaps', 'Current project timeline'],
          consequences: {
            'immediate': 'Learning curve and time commitment',
            '6months': 'Competitive advantage in job market',
            '12months': 'Significant salary and role advancement potential'
          }
        }
      ];
      
      setDecisions(mockDecisions);
      setIsUsingMockData(true);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error generating proactive decisions:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate decisions');
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
      isGenerating.current = false;
    }
  }, []);

  return {
    decisions,
    loading,
    error,
    generateProactiveDecisions,
    isUsingMockData,
    lastRefreshed
  };
}