import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GenerateTemplatesResult {
  success: boolean;
  templatesCreated?: number;
  equivalenciesCreated?: number;
  error?: string;
}

/**
 * Hook to generate BSBA templates AND seed equivalencies for an institution after pack promotion.
 * Calls seed-bsba-templates first, then seed-equivalencies-v1 with the institution_code.
 */
export function useGenerateTemplatesAfterPromote() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (institutionCode: string): Promise<GenerateTemplatesResult> => {
      console.log(`[useGenerateTemplatesAfterPromote] Generating templates for ${institutionCode}...`);
      
      // Step 1: Generate templates
      const { data: templateData, error: templateError } = await supabase.functions.invoke('seed-bsba-templates', {
        body: { 
          institution_code: institutionCode,
          program_code: 'BSBA',
          force_refresh: true,
        },
      });

      if (templateError) {
        throw new Error(`Template generation failed: ${templateError.message}`);
      }

      const templatesCreated = templateData?.summary?.templatesCreated ?? 0;
      console.log(`[useGenerateTemplatesAfterPromote] Created ${templatesCreated} templates for ${institutionCode}`);

      // Step 2: Seed equivalencies for this institution
      console.log(`[useGenerateTemplatesAfterPromote] Seeding equivalencies for ${institutionCode}...`);
      const { data: eqData, error: eqError } = await supabase.functions.invoke('seed-equivalencies-v1', {
        body: { 
          target_institutions: [institutionCode],
        },
      });

      if (eqError) {
        console.warn(`[useGenerateTemplatesAfterPromote] Equivalencies seeding failed for ${institutionCode}:`, eqError.message);
        // Don't throw - templates were created successfully
      }

      const equivalenciesCreated = eqData?.results?.inserted ?? 0;
      console.log(`[useGenerateTemplatesAfterPromote] Created ${equivalenciesCreated} equivalencies for ${institutionCode}`);

      return {
        success: templateData?.success ?? false,
        templatesCreated,
        equivalenciesCreated,
        error: templateData?.error,
      };
    },
    onSuccess: (data, institutionCode) => {
      if (data.success && (data.templatesCreated ?? 0) > 0) {
        const eqMsg = data.equivalenciesCreated ? ` + ${data.equivalenciesCreated} equivalencies` : '';
        toast({
          title: 'Templates generated',
          description: `Created ${data.templatesCreated} BSBA template(s)${eqMsg} for ${institutionCode}`,
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
