/**
 * Production-ready skill gap detection hook
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FALLBACK_SKILLS, SkillGap, QUERY_KEYS, type SkillPriority } from '@/types/skill';

// Development-only debug logging
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[skill-gaps]', ...args);
  }
};

export function useSkillGaps(userId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.SKILL_GAPS(userId),
    enabled: !!userId,
    staleTime: 60_000, // 1 minute
    queryFn: async (): Promise<SkillGap[]> => {
      if (!userId) {
        debug('No userId provided');
        return [];
      }

      try {
        debug('Fetching skill gaps for user:', userId);

        // Fetch user goals and skills in parallel
        const [goalsResult, userSkillsResult] = await Promise.all([
          supabase
            .from('career_goals')
            .select('id, target_role')
            .eq('user_id', userId)
            .eq('active', true),
          supabase
            .from('user_skill_progress')
            .select(`
              skill_id,
              skills!inner(name)
            `)
            .eq('user_id', userId)
            .eq('status', 'verified')
        ]);

        if (goalsResult.error) {
          debug('Error fetching goals:', goalsResult.error);
        }
        if (userSkillsResult.error) {
          debug('Error fetching user skills:', userSkillsResult.error);
        }

        const goals = goalsResult.data || [];
        const userSkillsData = userSkillsResult.data || [];

        // Extract current skills (normalized, case-insensitive)
        const normalize = (s: string) => s.trim().toLowerCase();
        const currentSkills = new Set(
          userSkillsData.map((item: any) => normalize(item.skills?.name || ''))
            .filter(Boolean)
        );

        debug('Current user skills:', Array.from(currentSkills));
        debug('User goals:', goals.length);

        let requiredSkills: string[] = [];

        // Fetch required skills from career paths using target_role
        for (const goal of goals) {
          if (!goal || !goal.target_role) continue;

          try {
            const { data: pathData } = await supabase
              .from('career_paths')
              .select('key_skills')
              .eq('title', goal.target_role)
              .maybeSingle();

            if (Array.isArray(pathData?.key_skills)) {
              requiredSkills.push(...pathData.key_skills.map((skill: string) => String(skill)));
              debug('Added skills from path:', pathData.key_skills);
            }
          } catch (error) {
            debug('Error fetching career path for goal:', goal, error);
          }
        }

        // Normalize and deduplicate required skills
        const uniqueSkills = Array.from(new Set(requiredSkills.map(normalize)));

        let candidateSkills = uniqueSkills;

        // Use fallback skills if no role skills found
        if (candidateSkills.length === 0) {
          debug('No role skills found; using fallback skills');
          candidateSkills = FALLBACK_SKILLS.map(f => normalize(f.skill));
        }

        // Build skill gaps (required skills - current skills)
        const gaps: SkillGap[] = [];
        for (const skillName of candidateSkills) {
          if (!currentSkills.has(skillName)) {
            // Find fallback config for priority and CRI impact
            const fallbackConfig = FALLBACK_SKILLS.find(f => normalize(f.skill) === skillName);
            
            const gap: SkillGap = {
              skill: skillName,
              currentLevel: 0,
              targetLevel: 3,
              priority: fallbackConfig?.priority ?? 'high',
              criImpact: fallbackConfig?.criImpact,
              estimatedTimeToClose: fallbackConfig?.priority === 'critical' ? '1–2 months' : '2–3 months',
              suggestedActions: [
                `Find courses for ${skillName}`,
                `Practice ${skillName} through projects`,
                `Connect with a mentor in ${skillName}`,
              ],
            };

            gaps.push(gap);
          }
        }

        // Sort by priority → criImpact desc → alphabetical
        const priorityRank: Record<SkillPriority, number> = { 
          critical: 0, 
          high: 1, 
          medium: 2, 
          low: 3 
        };

        gaps.sort((a, b) =>
          priorityRank[a.priority] - priorityRank[b.priority] ||
          (b.criImpact ?? 0) - (a.criImpact ?? 0) ||
          a.skill.localeCompare(b.skill)
        );

        // Limit to top 8 skill gaps
        const topGaps = gaps.slice(0, 8);
        debug('Final skill gaps:', topGaps.map(g => `${g.skill}:${g.priority}`).join(', '));

        return topGaps;

      } catch (error) {
        debug('Error generating skill gaps:', error);
        return [];
      }
    },
  });
}