import { useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { useSkillGaps } from '@/hooks/useSkillGaps'
import type { SkillGap, UnifiedRecommendation } from '@/types'

const debug = (...a: unknown[]) =>
  import.meta.env.DEV && console.debug('[unified-recos]', ...a)

// Strongly-typed, readable dedupe
function dedupeByKey<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>()
  return arr.filter(x => {
    const k = key(x)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function buildFromSkillGaps(skillGaps: SkillGap[], now?: Date): UnifiedRecommendation[] {
  const recs: UnifiedRecommendation[] = []

  for (const gap of skillGaps) {
    const priorityScore =
      gap.priority === 'critical' ? 4 :
      gap.priority === 'high'     ? 3 :
      gap.priority === 'medium'   ? 2 : 1

    let criBoost = priorityScore * 5
    if (gap.priority === 'critical') criBoost += 15
    if (gap.priority === 'high')     criBoost += 10

    recs.push({
      id: `sg-${gap.skill.toLowerCase()}`, // stable id (no index)
      type: 'skill_gap',
      title: `Close ${gap.skill} gap`,
      description: `You need ${gap.skill} for your career goals`,
      priority: gap.priority,
      reason: `CRI +${criBoost}% (priority ${gap.priority})`,
      timeEstimate: gap.estimatedTimeToClose,
      skills: [gap.skill],
      actions: [
        { label: 'Find Courses', href: `/discover?skills=${encodeURIComponent(gap.skill)}&filter=skill-gaps` },
        { label: 'Find Mentors', href: `/discover?tab=mentors&skill=${encodeURIComponent(gap.skill)}` },
        { label: 'Take Next Step', href: '/plan?tab=roadmap' },
      ],
      createdAt: (now ?? new Date()).toISOString(), // nullish-coalescing for deterministic tests
      score: (priorityScore * 1.2) + (criBoost / 10),
      criBoost,
      criExplanation: `Addresses a ${gap.priority} ${gap.skill} gap`,
    })
  }

  return recs
}

export function useUnifiedRecommendations(userId?: string) {
  const { data: skillGaps = [], isLoading: gapsLoading, isError: gapsError } = useSkillGaps(userId)

  // Encode skill gaps into the query key so React Query knows when to recompute
  const skillGapsKey = useMemo(
    () => skillGaps.map(g => `${g.skill.toLowerCase()}:${g.priority}`).sort().join('|'),
    [skillGaps]
  )

  return useQuery<UnifiedRecommendation[]>({
    queryKey: ['unified-recommendations', userId, skillGapsKey],
    enabled: !!userId && (!gapsLoading || gapsError),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const fromGaps = dedupeByKey(buildFromSkillGaps(skillGaps), r => r.id)
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 } as const
      fromGaps.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score
        const ap = priorityOrder[a.priority as keyof typeof priorityOrder]
        const bp = priorityOrder[b.priority as keyof typeof priorityOrder]
        if (ap !== bp) return bp - ap
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      debug('built', { gaps: skillGaps.length, total: fromGaps.length })
      return fromGaps
    },
  })
}