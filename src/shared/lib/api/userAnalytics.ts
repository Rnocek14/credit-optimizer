/**
 * API module for user analytics data (ResumeAnalyticsDashboard).
 */
import { supabase } from './client';

export interface UserStats {
  totalXp: number;
  badgeCount: number;
  activeGoals: number;
  transcriptCount: number;
  savedCoursesCount: number;
}

export interface ROIInsight {
  careerTitle: string;
  locationName: string;
  locationEmoji: string;
  projectedSalary: number;
  salaryUplift: number;
  roi: number;
  lqi: number;
}

export interface TimelineEvent {
  date: string;
  type: 'xp' | 'badge' | 'goal';
  title: string;
  value: number;
}

export interface SkillSnapshot {
  topSkills: string[];
  recommendedSkills: string[];
  completedCourseTags: string[];
}

export async function fetchUserStats(userId: string): Promise<UserStats> {
  const [xpData, badgesData, goalsData, transcriptsData, coursesData] = await Promise.all([
    supabase.from('user_xp').select('total_xp').eq('user_id', userId).maybeSingle(),
    supabase.from('user_badges').select('id').eq('user_id', userId),
    supabase.from('career_goals').select('id').eq('user_id', userId).eq('active', true),
    supabase.from('transcripts').select('id').eq('user_id', userId),
    supabase.from('saved_courses').select('id').eq('user_id', userId),
  ]);

  return {
    totalXp: xpData.data?.total_xp || 0,
    badgeCount: badgesData.data?.length || 0,
    activeGoals: goalsData.data?.length || 0,
    transcriptCount: transcriptsData.data?.length || 0,
    savedCoursesCount: coursesData.data?.length || 0,
  };
}

export async function fetchROIInsight(userId: string, userLocation: string): Promise<ROIInsight | null> {
  const [careerData, locationData] = await Promise.all([
    supabase.from('career_tracks').select('title').eq('user_id', userId).limit(1).maybeSingle(),
    supabase.from('locations').select('label, emoji').ilike('label', `%${userLocation}%`).limit(1).maybeSingle(),
  ]);

  if (!careerData.data || !locationData.data) return null;

  const baseSalary = 60000;
  const projectedSalary = baseSalary * 1.3;

  return {
    careerTitle: careerData.data.title,
    locationName: locationData.data.label,
    locationEmoji: locationData.data.emoji,
    projectedSalary,
    salaryUplift: projectedSalary - baseSalary,
    roi: 250,
    lqi: 85,
  };
}

export async function fetchTimelineEvents(userId: string): Promise<TimelineEvent[]> {
  const [xpEvents, badgeEvents, goalEvents] = await Promise.all([
    supabase.from('xp_events').select('created_at, xp_amount, reason').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('user_badges').select('earned_at, badges(name)').eq('user_id', userId).order('earned_at', { ascending: false }).limit(5),
    supabase.from('career_goals').select('created_at, title').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
  ]);

  const events: TimelineEvent[] = [];

  xpEvents.data?.forEach(event => {
    events.push({ date: event.created_at, type: 'xp', title: event.reason || 'XP earned', value: event.xp_amount });
  });

  badgeEvents.data?.forEach(event => {
    events.push({ date: event.earned_at, type: 'badge', title: `Earned: ${(event.badges as any)?.name || 'Badge'}`, value: 1 });
  });

  goalEvents.data?.forEach(event => {
    events.push({ date: event.created_at, type: 'goal', title: `Goal set: ${event.title}`, value: 1 });
  });

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
}

export async function fetchSkillSnapshot(userId: string): Promise<SkillSnapshot> {
  const [transcriptsData, coursesData] = await Promise.all([
    supabase.from('transcripts').select('skill_tags').eq('user_id', userId),
    supabase.from('saved_courses').select('recommended_courses(skill_tags)').eq('user_id', userId),
  ]);

  const allSkills: string[] = [];
  transcriptsData.data?.forEach(transcript => {
    if (transcript.skill_tags) allSkills.push(...transcript.skill_tags);
  });

  const skillCounts = allSkills.reduce((acc, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([skill]) => skill);

  const courseTags: string[] = [];
  coursesData.data?.forEach(course => {
    const courseData = course.recommended_courses as any;
    if (courseData?.skill_tags) courseTags.push(...courseData.skill_tags);
  });

  return {
    topSkills,
    recommendedSkills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS'],
    completedCourseTags: [...new Set(courseTags)].slice(0, 8),
  };
}
