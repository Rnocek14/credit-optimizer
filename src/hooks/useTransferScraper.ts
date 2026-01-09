import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ScrapeJob {
  id: string;
  url: string;
  institution: string;
  job_type: string;
  source_type: string | null;
  allowed_scrape: boolean;
  scrape_method: string;
  status: string;
  priority: number;
  retry_count: number;
  error_message: string | null;
  source_authority_score: number | null;
  created_at: string;
  updated_at: string;
  last_attempt_at: string | null;
}

export interface ScrapedContent {
  id: string;
  scrape_job_id: string;
  url: string;
  raw_html: string | null;
  extracted_text: string | null;
  source_type: string | null;
  ai_extracted_data: ExtractionResult | null;
  extraction_model: string | null;
  extraction_prompt_version: string | null;
  confidence_breakdown: ConfidenceBreakdown | null;
  total_confidence_score: number | null;
  scraped_at: string;
  extracted_at: string | null;
}

export interface PolicyPack {
  id: string;
  institution: string;
  academic_year: string;
  degree_level: string;
  policy_json: Record<string, unknown>;
  confidence_score: number | null;
  last_verified_at: string | null;
  verification_source: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderRule {
  id: string;
  source_institution: string;
  target_institution: string;
  rule_type: string | null;
  acceptance_status: string | null;
  rule_payload: Record<string, unknown> | null;
  confidence: number | null;
  status: string | null;
  last_verified_at: string | null;
}

export interface ConfidenceBreakdown {
  source_authority: number;
  language_certainty: number;
  cross_source_agreement: number;
  recency: number;
  structural_consistency: number;
  ai_certainty: number;
}

export interface ExtractionResult {
  policy_pack: Record<string, unknown> | null;
  provider_rules: Record<string, unknown>[];
  confidence: ConfidenceBreakdown;
  total_score: number;
  action: 'auto_approve' | 'human_review' | 'hold';
  extraction_notes?: string[];
}

export interface JobFilters {
  institution?: string;
  status?: string;
  source_type?: string;
}

export interface CrawlParams {
  url: string;
  institution: string;
  job_type: 'policy' | 'provider' | 'degree';
  priority?: number;
  source_type?: string;
  scrape_job_id?: string; // Pass existing job ID to update instead of create
}

export interface ValidateParams {
  scrape_job_id: string;
  force_action?: 'approve' | 'reject';
  reviewer_notes?: string;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useTransferScraper() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // List Jobs
  // ---------------------------------------------------------------------------
  const listJobs = useCallback(async (filters: JobFilters = {}): Promise<ScrapeJob[]> => {
    setLoading(true);
    setError(null);
    try {
      let query = (supabase as any)
        .from('scrape_jobs')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.institution) {
        query = query.eq('institution', filters.institution);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.source_type) {
        query = query.eq('source_type', filters.source_type);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      return data || [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch jobs';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Get Content for Job
  // ---------------------------------------------------------------------------
  const getContentForJob = useCallback(async (scrapeJobId: string): Promise<ScrapedContent | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from('scraped_content')
        .select('*')
        .eq('scrape_job_id', scrapeJobId)
        .maybeSingle();

      if (err) throw err;
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch content';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Get Latest Active Policy Pack
  // ---------------------------------------------------------------------------
  const getLatestPolicyPack = useCallback(async (institution: string): Promise<PolicyPack | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from('institution_policy_packs')
        .select('*')
        .eq('institution', institution)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err) throw err;
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch policy pack';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Get Provider Rules
  // ---------------------------------------------------------------------------
  const getProviderRules = useCallback(async (institution: string): Promise<ProviderRule[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from('credit_transfer_rules')
        .select('*')
        .eq('target_institution', institution)
        .eq('rule_type', 'provider_acceptance')
        .in('status', ['active', 'draft'])
        .order('last_verified_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (err) throw err;
      return data || [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch provider rules';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Crawl URL
  // ---------------------------------------------------------------------------
  const crawl = useCallback(async (params: CrawlParams) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('transfer-scraper-crawl', {
        body: params,
      });

      if (err) throw err;
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Crawl failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Extract from Job
  // ---------------------------------------------------------------------------
  const extract = useCallback(async (scrapeJobId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('transfer-scraper-extract', {
        body: { scrape_job_id: scrapeJobId },
      });

      if (err) throw err;
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Extraction failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Validate/Publish
  // ---------------------------------------------------------------------------
  const validate = useCallback(async (params: ValidateParams) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('transfer-scraper-validate', {
        body: params,
      });

      if (err) throw err;
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Validation failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Add New URL to Queue
  // ---------------------------------------------------------------------------
  const addToQueue = useCallback(async (params: CrawlParams): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from('scrape_jobs')
        .insert({
          url: params.url,
          institution: params.institution,
          job_type: params.job_type,
          source_type: params.source_type || 'policy',
          priority: params.priority || 5,
          status: 'pending',
        })
        .select('id')
        .single();

      if (err) throw err;
      return data?.id || null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add to queue';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    listJobs,
    getContentForJob,
    getLatestPolicyPack,
    getProviderRules,
    crawl,
    extract,
    validate,
    addToQueue,
  };
}
