import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/authHelper';

interface MayaGenerateButtonProps {
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const MayaGenerateButton: React.FC<MayaGenerateButtonProps> = ({
  onSuccess,
  variant = "outline",
  size = "default",
  className
}) => {
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      console.log('Generating Maya insights manually...');
      
      // Get current user for dev mode support
      const currentUser = await getCurrentUser();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add dev user ID header if in dev mode
      if (currentUser?.isDevUser) {
        headers['x-dev-user-id'] = currentUser.id;
      }
      
      const { data, error } = await supabase.functions.invoke('maya-manual-insights', {
        headers
      });

      if (error) {
        console.error('Generation error:', error);
        toast.error(`Failed to generate insights: ${error.message}`);
        return;
      }

      console.log('Generation response:', data);

      if (data?.success) {
        setLastGenerated(new Date());
        toast.success(`Generated ${data.generatedCount || 0} new insights!`);
        onSuccess?.();
      } else {
        toast.error(data?.error || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Generation request error:', error);
      toast.error('Failed to generate insights. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={generating}
      variant={variant}
      size={size}
      className={className}
    >
      {generating ? (
        <>
          <Clock className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : lastGenerated ? (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Generate New
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Insights
        </>
      )}
    </Button>
  );
};