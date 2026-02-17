/**
 * API module for PublicResume + ResumeGallery pages.
 */
import { supabase } from './client';

// ── Public Resume queries ──

export async function fetchPublicProfile(userId: string) {
  // Try user_id first, then id for demo compatibility
  const { data: byUserId } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (byUserId) return byUserId;

  const { data: byId } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return byId ?? null;
}

export async function fetchUserBadges(userId: string) {
  const { data } = await supabase
    .from('user_badges')
    .select(`
      id,
      badge:badges(
        name,
        emoji,
        description,
        slug
      )
    `)
    .eq('user_id', userId);

  return data || [];
}

export async function fetchResumeViewCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('resume_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', 'view');

  return data?.length || 0;
}

export async function fetchRecommendedCourses(mentorId: string) {
  const { data } = await supabase
    .from('recommended_courses')
    .select('id, title, platform, difficulty, cost, skill_tags, url, is_ai_recommended')
    .eq('mentor_id', mentorId)
    .eq('active', true)
    .limit(3);

  return data || [];
}

export async function fetchPublishedResumeDraft(userId: string) {
  const { data } = await supabase
    .from('ai_resume_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('published_to_profile', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function trackResumeEvent(
  userId: string,
  eventType: string,
  source: string,
  metadata?: Record<string, unknown>
) {
  await supabase.from('resume_events').insert({
    user_id: userId,
    event_type: eventType,
    source,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });
}

// ── Gallery queries ──

export async function fetchGalleryProfiles() {
  const { data: profilesData, error } = await supabase
    .from('profiles')
    .select(`
      id,
      user_id,
      name,
      role_title,
      location,
      industry,
      resume_review_summary,
      gallery_featured,
      skills,
      created_at
    `)
    .eq('gallery_enabled', true)
    .not('resume_review_summary', 'is', null);

  if (error) throw error;

  const profilesWithStats = await Promise.all(
    (profilesData || []).map(async (profile) => {
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select(`
          id,
          badge:badges (
            name,
            emoji,
            description,
            slug
          )
        `)
        .eq('user_id', profile.user_id);

      const { data: events } = await supabase
        .from('resume_events')
        .select('created_at')
        .eq('user_id', profile.user_id)
        .eq('event_type', 'view')
        .order('created_at', { ascending: false });

      return {
        ...profile,
        badges: badgesData || [],
        view_count: events?.length || 0,
        latest_view: events?.[0]?.created_at || profile.created_at,
      };
    })
  );

  return profilesWithStats;
}
