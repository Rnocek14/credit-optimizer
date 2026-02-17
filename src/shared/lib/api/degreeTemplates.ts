import { supabase } from './client';

export interface TemplateStatusCounts {
  active: number;
  pending: number;
  blocked: number;
  total: number;
}

export async function fetchTemplateStatusCounts(): Promise<TemplateStatusCounts> {
  const { data, error } = await supabase
    .from('degree_templates')
    .select('status');

  if (error) throw error;

  const active = data?.filter(t => t.status === 'active').length ?? 0;
  const pending = data?.filter(t => t.status === 'pending_review').length ?? 0;
  const blocked = data?.filter(t => t.status === 'blocked').length ?? 0;

  return { active, pending, blocked, total: data?.length ?? 0 };
}
