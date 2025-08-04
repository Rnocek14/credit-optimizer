import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DataImport {
  id: string;
  user_id: string;
  import_type: 'linkedin' | 'resume' | 'transcript' | 'manual';
  import_source: string;
  raw_data: any;
  processed_data: any;
  import_status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence_score: number;
  created_at: string;
  processed_at?: string;
  error_message?: string;
  metadata: any;
}

interface SkillExtraction {
  id: string;
  user_id: string;
  import_id?: string;
  skill_name: string;
  skill_category?: string;
  confidence_score: number;
  extraction_source: 'linkedin' | 'resume' | 'transcript';
  context_snippet?: string;
  validated: boolean;
  created_at: string;
  metadata: any;
}

export function useDataImport() {
  const [isImporting, setIsImporting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user's import history
  const {
    data: imports = [],
    isLoading: isLoadingImports,
    error: importsError
  } = useQuery({
    queryKey: ['data-imports'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('data_imports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DataImport[];
    },
  });

  // Fetch extracted skills
  const {
    data: skillExtractions = [],
    isLoading: isLoadingSkills,
    error: skillsError
  } = useQuery({
    queryKey: ['skill-extractions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('skill_extractions')
        .select('*')
        .eq('user_id', user.id)
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return data as SkillExtraction[];
    },
  });

  // LinkedIn import mutation
  const linkedInImportMutation = useMutation({
    mutationFn: async (authorizationCode: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('linkedin-import', {
        body: {
          action: 'import',
          authorizationCode,
          userId: user.id,
          redirectUri: `${window.location.origin}/onboarding`
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-imports'] });
      queryClient.invalidateQueries({ queryKey: ['skill-extractions'] });
      toast({
        title: "LinkedIn Import Successful",
        description: `Imported profile data and extracted ${data.skillsExtracted || 0} skills`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "LinkedIn Import Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Validate/update skill mutation
  const validateSkillMutation = useMutation({
    mutationFn: async ({ skillId, validated }: { skillId: string; validated: boolean }) => {
      const { error } = await supabase
        .from('skill_extractions')
        .update({ validated })
        .eq('id', skillId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-extractions'] });
    }
  });

  // Get import statistics
  const getImportStats = () => {
    const stats = {
      totalImports: imports.length,
      completedImports: imports.filter(imp => imp.import_status === 'completed').length,
      failedImports: imports.filter(imp => imp.import_status === 'failed').length,
      totalSkills: skillExtractions.length,
      validatedSkills: skillExtractions.filter(skill => skill.validated).length,
      bySource: {
        linkedin: imports.filter(imp => imp.import_type === 'linkedin').length,
        resume: imports.filter(imp => imp.import_type === 'resume').length,
        transcript: imports.filter(imp => imp.import_type === 'transcript').length,
      }
    };

    return stats;
  };

  // Get data completeness score
  const getDataCompleteness = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: profile } = await supabase
      .from('profiles')
      .select('data_completeness_score')
      .eq('user_id', user.id)
      .single();

    return profile?.data_completeness_score || 0;
  };

  return {
    // Data
    imports,
    skillExtractions,
    importStats: getImportStats(),
    
    // Loading states
    isLoadingImports,
    isLoadingSkills,
    isImporting: isImporting || linkedInImportMutation.isPending,
    
    // Errors
    importsError,
    skillsError,
    
    // Actions
    importFromLinkedIn: (authorizationCode: string) => linkedInImportMutation.mutateAsync(authorizationCode),
    validateSkill: validateSkillMutation.mutate,
    getDataCompleteness,
    
    // Mutation states
    isValidatingSkill: validateSkillMutation.isPending,
  };
}