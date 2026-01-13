import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GenerateTemplatesResult {
  success: boolean;
  templatesCreated?: number;
  error?: string;
}

/**
 * Hook to generate BSBA templates for an institution after pack promotion.
 * Calls the seed-bsba-templates edge function with the institution_code.
 */
export function useGenerateTemplatesAfterPromote() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (institutionCode: string): Promise<GenerateTemplatesResult> => {
      console.log(`[useGenerateTemplatesAfterPromote] Generating templates for ${institutionCode}...`);
      
      const { data, error } = await supabase.functions.invoke('seed-bsba-templates', {
        body: { 
          institution_code: institutionCode,
          program_code: 'BSBA',
          force_refresh: true,
        },
      });

      if (error) {
        throw new Error(`Template generation failed: ${error.message}`);
      }

      return {
        success: data?.success ?? false,
        templatesCreated: data?.summary?.templatesCreated ?? 0,
        error: data?.error,
      };
    },
    onSuccess: (data, institutionCode) => {
      if (data.success && (data.templatesCreated ?? 0) > 0) {
        toast({
          title: 'Templates generated',
          description: `Created ${data.templatesCreated} BSBA template(s) for ${institutionCode}`,
        });
      } else if (data.templatesCreated === 0) {
        console.warn(`[useGenerateTemplatesAfterPromote] No templates created for ${institutionCode}`);
      }
    },
    onError: (error: Error, institutionCode) => {
      console.error(`[useGenerateTemplatesAfterPromote] Failed for ${institutionCode}:`, error);
      toast({
        title: 'Template generation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
