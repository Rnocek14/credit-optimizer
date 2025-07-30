import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send } from 'lucide-react';

interface MayaDecisionFeedbackProps {
  decisionId: string;
  currentRating?: number;
  currentFeedback?: string;
  onFeedbackUpdate?: () => void;
}

export function MayaDecisionFeedback({ 
  decisionId, 
  currentRating = 0, 
  currentFeedback = '',
  onFeedbackUpdate 
}: MayaDecisionFeedbackProps) {
  const [rating, setRating] = useState(currentRating);
  const [feedback, setFeedback] = useState(currentFeedback);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitFeedback = async () => {
    try {
      setIsSubmitting(true);
      
      const updates: any = {};
      if (rating > 0) updates.user_feedback_rating = rating;
      if (feedback.trim()) updates.user_feedback = feedback.trim();

      const { error } = await supabase
        .from('maya_decisions')
        .update(updates)
        .eq('id', decisionId);

      if (error) throw error;

      toast({
        title: "Feedback submitted",
        description: "Thank you for helping Maya improve!",
      });

      onFeedbackUpdate?.();
      setShowFeedbackInput(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    // Auto-submit if just rating (no text feedback)
    if (!showFeedbackInput) {
      submitFeedback();
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Rate this decision:</span>
          <StarRating
            rating={rating}
            onRatingChange={handleRatingChange}
            size="sm"
          />
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFeedbackInput(!showFeedbackInput)}
          className="text-xs h-6 px-2"
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          Feedback
        </Button>
      </div>

      {showFeedbackInput && (
        <div className="space-y-2">
          <Textarea
            placeholder="Help Maya improve by sharing your thoughts..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="text-xs min-h-[60px] resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedbackInput(false)}
              className="text-xs h-6 px-2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submitFeedback}
              disabled={isSubmitting || (!rating && !feedback.trim())}
              className="text-xs h-6 px-2"
            >
              <Send className="w-3 h-3 mr-1" />
              Submit
            </Button>
          </div>
        </div>
      )}

      {currentFeedback && !showFeedbackInput && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
          <strong>Your feedback:</strong> {currentFeedback}
        </div>
      )}
    </div>
  );
}