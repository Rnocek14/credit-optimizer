import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Loader2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MayaDecisionExplainerProps {
  decisionId: string;
  decisionType: string;
  rationale: string;
  context: any;
  executionResult: any;
  confidence: number;
  existingExplanation?: string;
}

const MayaDecisionExplainer: React.FC<MayaDecisionExplainerProps> = ({
  decisionId,
  decisionType,
  rationale,
  context,
  executionResult,
  confidence,
  existingExplanation
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [explanation, setExplanation] = useState(existingExplanation || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateExplanation = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-decision-explanation', {
        body: {
          decisionId,
          decisionType,
          rationale,
          context,
          executionResult
        }
      });

      if (error) throw error;

      if (data?.explanation) {
        setExplanation(data.explanation);
        toast({
          title: "Explanation Generated",
          description: "Maya has explained the reasoning behind this decision.",
        });
      }
    } catch (error) {
      console.error('Error generating explanation:', error);
      toast({
        title: "Error",
        description: "Failed to generate explanation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceInsight = () => {
    if (confidence >= 0.8) return { color: 'bg-green-100 text-green-800', text: 'High confidence - strong data support' };
    if (confidence >= 0.6) return { color: 'bg-yellow-100 text-yellow-800', text: 'Moderate confidence - good reasoning' };
    return { color: 'bg-orange-100 text-orange-800', text: 'Lower confidence - experimental approach' };
  };

  const confidenceInsight = getConfidenceInsight();

  return (
    <div className="mt-3 border-t pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-2 h-auto"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium">Why this decision?</span>
          <Badge className={`text-xs ${confidenceInsight.color}`}>
            {confidenceInsight.text}
          </Badge>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {isExpanded && (
        <div className="mt-3 space-y-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
          {!explanation ? (
            <div className="text-center">
              <Lightbulb className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                Let Maya explain the reasoning behind this decision
              </p>
              <Button
                onClick={generateExplanation}
                disabled={isGenerating}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Explain Decision
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-sm text-purple-700">Maya's Reasoning</span>
              </div>
              
              <div className="bg-white rounded-lg p-3 text-sm leading-relaxed shadow-sm">
                {explanation.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2 last:mb-0 text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded p-2 shadow-sm">
                  <div className="font-medium text-gray-600 mb-1">Decision Factors</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Confidence Level:</span>
                      <span className="font-medium">{(confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium capitalize">{decisionType.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {executionResult && (
                  <div className="bg-white rounded p-2 shadow-sm">
                    <div className="font-medium text-gray-600 mb-1">Execution Result</div>
                    <div className="text-gray-700">
                      {executionResult.success ? (
                        <span className="text-green-600">✓ Successful</span>
                      ) : (
                        <span className="text-red-600">✗ Failed</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MayaDecisionExplainer;