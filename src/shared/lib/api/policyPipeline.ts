/**
 * API module for Admin Policy Pipeline pages.
 * Covers PolicyPackPipeline + PolicyFieldReview.
 */
import { supabase } from './client';

// ── Types ──

export interface InstitutionPack {
  id: string;
  institution: string;
  status: string;
  confidence_score: number | null;
  completeness_score: number | null;
  has_ground_truth: boolean;
  updated_at: string;
  policy_data: Record<string, unknown> | null;
  blocked_reason: string | null;
}

export interface UrlTemplate {
  id: string;
  institution_code: string;
  url: string;
  page_type: string;
  priority: number;
  status: string;
  last_scraped_at: string | null;
  created_at: string;
}

export interface RefreshTask {
  id: string;
  run_id: string | null;
  institution: string;
  status: string | null;
  reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface FieldExtraction {
  id: string;
  job_id: string;
  field_path: string;
  extracted_value: unknown;
  confidence: number;
  source_quote: string | null;
  source_url: string | null;
  review_status: string;
  reviewer_notes: string | null;
  final_value: unknown | null;
  created_at: string | null;
}

export interface PromotionCandidate {
  pack_id: string;
  institution: string;
  status: string;
  confidence_score: number;
  has_ground_truth: boolean;
  gate_status: 'green' | 'yellow' | 'red';
  is_promotable: boolean;
}

// ── Pipeline queries ──

export async function fetchPipelineInstitutions(): Promise<string[]> {
  const [packsResult, templatesResult] = await Promise.all([
    supabase.from('institution_policy_packs').select('institution').order('institution'),
    supabase.from('scrape_url_templates').select('institution_code').order('institution_code'),
  ]);

  const packInstitutions = new Set((packsResult.data || []).map(p => p.institution));
  const templateInstitutions = new Set((templatesResult.data || []).map(t => t.institution_code));

  return Array.from(new Set([...packInstitutions, ...templateInstitutions])).sort();
}

export async function fetchPolicyPacks(): Promise<InstitutionPack[]> {
  const { data, error } = await supabase
    .from('institution_policy_packs')
    .select('id, institution, status, confidence_score, completeness_score, has_ground_truth, updated_at, policy_data, blocked_reason')
    .order('institution');

  if (error) throw error;
  return (data ?? []) as InstitutionPack[];
}

export async function fetchUrlTemplates(institutionCode: string): Promise<UrlTemplate[]> {
  const { data, error } = await supabase
    .from('scrape_url_templates')
    .select('*')
    .eq('institution_code', institutionCode)
    .order('priority');

  if (error) throw error;
  return (data ?? []) as UrlTemplate[];
}

export async function fetchRefreshTasks(institution: string): Promise<RefreshTask[]> {
  const { data, error } = await supabase
    .from('policy_refresh_tasks')
    .select('*')
    .eq('institution', institution)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data ?? []) as RefreshTask[];
}

export async function addUrlTemplate(institutionCode: string, url: string, pageType: string) {
  const { data, error } = await supabase
    .from('scrape_url_templates')
    .insert({
      institution_code: institutionCode,
      url: url.trim(),
      page_type: pageType,
      priority: 5,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUrlTemplate(templateId: string) {
  const { error } = await supabase
    .from('scrape_url_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

// ── Field Review queries ──

export async function fetchExtractionInstitutions(): Promise<string[]> {
  const [packsResult, jobsResult] = await Promise.all([
    supabase.from('institution_policy_packs').select('institution'),
    supabase.from('school_scrape_jobs').select('institution_code'),
  ]);

  const packInstitutions = (packsResult.data || []).map(p => p.institution);
  const jobInstitutions = (jobsResult.data || []).map(j => j.institution_code);

  return Array.from(new Set([...packInstitutions, ...jobInstitutions])).filter(Boolean).sort();
}

export async function fetchFieldExtractions(institution: string): Promise<FieldExtraction[]> {
  const { data: jobs, error: jobsError } = await supabase
    .from('school_scrape_jobs')
    .select('id')
    .eq('institution_code', institution)
    .order('created_at', { ascending: false })
    .limit(50);

  if (jobsError) throw jobsError;
  if (!jobs || jobs.length === 0) return [];

  const jobIds = jobs.map(j => j.id);

  const { data, error } = await supabase
    .from('policy_field_extractions')
    .select('*')
    .in('job_id', jobIds)
    .order('field_path', { ascending: true })
    .order('confidence', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as FieldExtraction[];
}

export async function fetchPromotionCandidate(institution: string): Promise<PromotionCandidate | null> {
  const { data, error } = await supabase
    .from('v_policy_pack_promotion_candidates')
    .select('*')
    .eq('institution', institution)
    .maybeSingle();

  if (error) throw error;
  return data as PromotionCandidate | null;
}

export async function fetchBuildStatus(institution: string): Promise<{ status: string; created_at: string } | null> {
  const { data, error } = await supabase
    .from('policy_refresh_tasks')
    .select('status, created_at')
    .eq('institution', institution)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateFieldExtraction(
  id: string,
  status: 'approved' | 'rejected' | 'modified',
  finalValue?: unknown,
  notes?: string
) {
  const updateData: Record<string, unknown> = {
    review_status: status,
    reviewer_notes: notes || null,
  };

  if (status === 'modified' && finalValue !== undefined) {
    updateData.final_value = finalValue;
  }

  const { error } = await supabase
    .from('policy_field_extractions')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;
}

export async function upsertGroundTruth(
  institution: string,
  fieldName: string,
  value: unknown,
  sourceUrl?: string
) {
  const fieldMapping: Record<string, string> = {
    'residency_credits': 'residency_credits',
    'min_institutional_credits': 'residency_credits',
    'max_transfer_credits': 'max_transfer_credits',
    'max_alt_credit': 'max_ace_nccrs_credits',
    'max_ace_nccrs_credits': 'max_ace_nccrs_credits',
    'total_credits': 'total_credits_required_bachelors',
    'total_credits_required': 'total_credits_required_bachelors',
    'degree_credit_total': 'total_credits_required_bachelors',
    'accepts_ap': 'accepts_ap',
    'accepts_clep': 'accepts_clep',
    'accepts_dsst': 'accepts_dsst',
    'capstone_required': 'capstone_required',
    'cornerstone_required': 'cornerstone_required',
    'min_upper_level_credits': 'min_upper_level_credits',
    'upper_division_min': 'min_upper_level_credits',
  };

  const normalizedKey = fieldName.split('.').slice(-1)[0];
  const columnName = fieldMapping[normalizedKey] || fieldMapping[fieldName];
  if (!columnName) {
    throw new Error(`Unknown field: ${fieldName} (normalized: ${normalizedKey})`);
  }

  const { error } = await supabase
    .from('institution_policy_ground_truth')
    .upsert({
      institution,
      [columnName]: value,
      source_url: sourceUrl || null,
      last_verified_at: new Date().toISOString(),
    }, {
      onConflict: 'institution',
    });

  if (error) throw error;
}
