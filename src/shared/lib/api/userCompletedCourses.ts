/**
 * API module for user completed courses (TranscriptQuickEntry).
 */
import { supabase } from './client';

export interface CompletedCourseInsert {
  userId: string;
  providerCode: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string;
  source?: string;
  marketplaceCourseId?: string;
}

export async function insertUserCompletedCourse(params: CompletedCourseInsert) {
  const { error } = await supabase.from('user_completed_courses').insert({
    user_id: params.userId,
    provider_code: params.providerCode,
    course_code: params.courseCode,
    course_title: params.courseTitle,
    credits: params.credits,
    grade: params.grade,
    source: params.source ?? 'manual',
    marketplace_course_id: params.marketplaceCourseId,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This course has already been added');
    }
    throw error;
  }
}

export interface MarketplaceCourseForEntry {
  id: string;
  code: string;
  title: string;
  credits: number;
  provider_id: string;
}

export async function fetchMarketplaceCoursesForEntry(providerCode?: string): Promise<MarketplaceCourseForEntry[]> {
  let query = supabase
    .from('marketplace_courses')
    .select('id, code, title, credits, provider_id, providers!inner(provider_code)')
    .eq('active', true)
    .order('title');

  if (providerCode) {
    query = query.eq('providers.provider_code', providerCode);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchMarketplaceCoursesForEntry] Provider join failed:', error);
    return [];
  }
  return (data || []) as MarketplaceCourseForEntry[];
}
