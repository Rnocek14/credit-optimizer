import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type JobStatus = 'pending' | 'scraping' | 'extracting' | 'review' | 'completed' | 'failed';

export interface ScrapeJob {
  id: string;
  institution_code: string;
  target_urls: string[];
  status: JobStatus;
  scraped_content: Array<{ url: string; text: string; error?: string; fetchedAt: string }> | null;
  extracted_data: Record<string, unknown> | null;
  overall_confidence: number | null;
  error_message: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldExtraction {
  id: string;
  job_id: string;
  field_path: string;
  extracted_value: unknown;
  confidence: number;
  source_quote: string | null;
  source_url: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'modified';
  reviewer_notes: string | null;
  final_value: unknown | null;
  created_at: string;
}

export interface UrlTemplate {
  id: string;
  institution_code: string;
  url: string;
  page_type: string;
  priority: number;
  last_scraped_at: string | null;
  created_at: string;
}

/**
 * Hook to fetch all scrape jobs
 */
export function useScrapeJobs(limit = 50) {
  return useQuery({
    queryKey: ['scrape-jobs', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('school_scrape_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as ScrapeJob[];
    },
  });
}

/**
 * Hook to fetch jobs pending review
 */
export function useReviewQueue() {
  return useQuery({
    queryKey: ['scrape-jobs', 'review'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('school_scrape_jobs')
        .select('*')
        .eq('status', 'review')
        .order('overall_confidence', { ascending: true });
      
      if (error) throw error;
      return data as ScrapeJob[];
    },
  });
}

/**
 * Hook to fetch field extractions for a job
 */
export function useFieldExtractions(jobId: string | null) {
  return useQuery({
    queryKey: ['field-extractions', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      
      const { data, error } = await (supabase as any)
        .from('policy_field_extractions')
        .select('*')
        .eq('job_id', jobId)
        .order('field_path');
      
      if (error) throw error;
      return data as FieldExtraction[];
    },
    enabled: !!jobId,
  });
}

/**
 * Hook to fetch URL templates for an institution
 */
export function useUrlTemplates(institutionCode: string) {
  return useQuery({
    queryKey: ['scrape-templates', institutionCode],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('scrape_url_templates')
        .select('*')
        .eq('institution_code', institutionCode)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as UrlTemplate[];
    },
    enabled: !!institutionCode,
  });
}

/**
 * Hook to start a new scrape job
 */
export function useStartScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      institutionCode, 
      customUrls 
    }: { 
      institutionCode: string; 
      customUrls?: string[] 
    }) => {
      const { data, error } = await supabase.functions.invoke('school-scraper', {
        body: { 
          institutionCode, 
          customUrls: customUrls?.length ? customUrls : undefined 
        },
      });
      
      if (error) throw error;
      return data as { 
        success: boolean; 
        jobId: string; 
        overallConfidence: number;
        status: JobStatus;
        uncertainFields: string[];
      };
    },
    onSuccess: (data) => {
      toast.success(`Scrape completed`, {
        description: `${data.overallConfidence}% confidence, ${data.uncertainFields.length} uncertain fields`,
      });
      queryClient.invalidateQueries({ queryKey: ['scrape-jobs'] });
    },
    onError: (error) => {
      toast.error('Scrape failed', {
        description: (error as Error).message,
      });
    },
  });
}

/**
 * Hook to update a field extraction
 */
export function useUpdateFieldExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fieldId, 
      status, 
      finalValue, 
      notes 
    }: { 
      fieldId: string; 
      status: 'approved' | 'rejected' | 'modified'; 
      finalValue?: unknown;
      notes?: string;
    }) => {
      const { error } = await (supabase as any)
        .from('policy_field_extractions')
        .update({
          review_status: status,
          final_value: finalValue,
          reviewer_notes: notes,
        })
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['field-extractions'] });
      toast.success(`Field ${variables.status}`);
    },
    onError: (error) => {
      toast.error('Update failed', { description: (error as Error).message });
    },
  });
}

/**
 * Hook to complete a job review
 */
export function useCompleteJobReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await (supabase as any)
        .from('school_scrape_jobs')
        .update({ 
          status: 'completed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Review completed');
      queryClient.invalidateQueries({ queryKey: ['scrape-jobs'] });
    },
    onError: (error) => {
      toast.error('Failed to complete review', { description: (error as Error).message });
    },
  });
}

/**
 * Hook to add a URL template
 */
export function useAddUrlTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      institutionCode, 
      url, 
      pageType,
      priority,
    }: { 
      institutionCode: string;
      url: string; 
      pageType: string;
      priority?: number;
    }) => {
      const { error } = await (supabase as any)
        .from('scrape_url_templates')
        .insert({
          institution_code: institutionCode,
          url,
          page_type: pageType,
          priority: priority ?? 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('URL template added');
      queryClient.invalidateQueries({ queryKey: ['scrape-templates'] });
    },
    onError: (error) => {
      toast.error('Failed to add template', { description: (error as Error).message });
    },
  });
}

/**
 * Hook to delete a URL template
 */
export function useDeleteUrlTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await (supabase as any)
        .from('scrape_url_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('URL template deleted');
      queryClient.invalidateQueries({ queryKey: ['scrape-templates'] });
    },
    onError: (error) => {
      toast.error('Failed to delete template', { description: (error as Error).message });
    },
  });
}
