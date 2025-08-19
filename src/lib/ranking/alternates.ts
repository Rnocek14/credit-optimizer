import type { ProviderAlternative } from '@/hooks/useProviderAlternates';

interface RankingCriteria {
  skillTags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;
}

export function rankAlternatives(
  alternatives: ProviderAlternative[], 
  criteria: RankingCriteria
): ProviderAlternative[] {
  const { skillTags = [], difficulty, estimatedHours } = criteria;

  // Calculate scores for each alternative
  const scoredAlternatives = alternatives.map(alt => {
    let score = 0;
    const scores = {
      institutionReputation: 0,
      teacherRating: 0,
      outcomeScore: 0,
      skillMatch: 0,
      difficultyMatch: 0,
      timeEfficiency: 0,
    };

    // Institution reputation (20% weight)
    scores.institutionReputation = (alt.institution.reputation_score / 100) * 0.2;

    // Teacher rating (25% weight)
    if (alt.teacher) {
      scores.teacherRating = (alt.teacher.average_rating / 5) * 0.25;
    }

    // Outcome score (20% weight)
    if (alt.teacher?.outcome_score) {
      scores.outcomeScore = (alt.teacher.outcome_score / 100) * 0.2;
    }

    // Skill specialization match (15% weight)
    if (alt.teacher?.specializations && skillTags.length > 0) {
      const matchCount = alt.teacher.specializations.filter(spec =>
        skillTags.some(tag => spec.toLowerCase().includes(tag.toLowerCase()))
      ).length;
      scores.skillMatch = (matchCount / Math.max(skillTags.length, 1)) * 0.15;
    }

    // Difficulty appropriateness (10% weight)
    if (difficulty && alt.teacher?.experience_years) {
      const experienceScore = Math.min(alt.teacher.experience_years / 10, 1);
      const difficultyWeight = difficulty === 'beginner' ? 0.7 : 
                              difficulty === 'intermediate' ? 0.8 : 1.0;
      scores.difficultyMatch = experienceScore * difficultyWeight * 0.1;
    }

    // Time efficiency (10% weight) - favor faster completion
    if (estimatedHours && alt.teacher?.response_rate) {
      const efficiencyScore = alt.teacher.response_rate / 100;
      scores.timeEfficiency = efficiencyScore * 0.1;
    }

    // Calculate total score
    score = Object.values(scores).reduce((sum, s) => sum + s, 0);

    // Add some randomness to prevent always showing the same order
    score += Math.random() * 0.05;

    return {
      ...alt,
      totalScore: score,
      // Calculate deltas (mock calculations for demo)
      criDelta: alt.teacher ? (Math.random() - 0.5) * 2 : undefined,
      timeDelta: estimatedHours ? Math.round((Math.random() - 0.5) * 20) : undefined,
      costDelta: Math.round((Math.random() - 0.5) * 200),
    };
  });

  // Sort by total score
  const sorted = scoredAlternatives.sort((a, b) => b.totalScore - a.totalScore);

  // Add best-in-class badges
  const bestRating = Math.max(...sorted.filter(a => a.teacherRating).map(a => a.teacherRating!));
  const bestOutcome = Math.max(...sorted.filter(a => a.outcomeScore).map(a => a.outcomeScore!));
  const fastestTime = Math.min(...sorted.filter(a => a.timeDelta).map(a => a.timeDelta!));

  return sorted.map(alt => ({
    ...alt,
    isBestRating: alt.teacherRating === bestRating && alt.teacherRating > 0,
    isBestOutcome: alt.outcomeScore === bestOutcome && alt.outcomeScore > 0,
    isFastest: alt.timeDelta === fastestTime && alt.timeDelta < 0,
  }));
}