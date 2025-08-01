import { useState, useCallback } from 'react';
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
  const { sendEnhancedRequest } = useEnhancedMaya();

  const generateProactiveDecisions = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error('Error generating proactive decisions:', error);
    } finally {
      setLoading(false);
    }
  }, [sendEnhancedRequest]);

  return {
    decisions,
    loading,
    generateProactiveDecisions
  };
}