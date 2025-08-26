// Utility functions for Course Intelligence
// Handles data transformation and scoring

import type { CICourse, CIPlatform, CIInstructor } from "@/types/course-intelligence";

// Convert snake_case to camelCase
export const toCamel = <T>(obj: any): T => {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamel(item)) as T;
  } else if (obj !== null && typeof obj === 'object') {
    const camelObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelObj[camelKey] = toCamel(value);
    }
    return camelObj as T;
  }
  return obj as T;
};

// Convert camelCase to snake_case
export const toSnake = <T>(obj: any): T => {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnake(item)) as T;
  } else if (obj !== null && typeof obj === 'object') {
    const snakeObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeObj[snakeKey] = toSnake(value);
    }
    return snakeObj as T;
  }
  return obj as T;
};

// Sigmoid function for scoring
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

// Weighted average blend
export const blend = (...pairs: [number, number][]): number => {
  const numerator = pairs.reduce((sum, [value, weight]) => sum + value * weight, 0);
  const denominator = pairs.reduce((sum, [, weight]) => sum + weight, 0);
  return denominator > 0 ? numerator / denominator : 0;
};

// Hydrate course from database row
export const hydrateCourse = (row: any): CICourse => {
  return {
    id: row.id,
    platform: {
      id: row.platform_id,
      slug: row.platform_slug || row.platform?.slug || 'unknown',
      name: row.platform_name || row.platform?.name || 'Unknown Platform',
      url: row.platform_url || row.platform?.website_url || ''
    } as CIPlatform,
    instructor: row.instructor_id ? {
      id: row.instructor_id,
      name: row.instructor_name || row.instructor?.name || 'Unknown Instructor',
      org: row.instructor_org || row.instructor?.organization,
      reputation: row.instructor_reputation || row.instructor?.reputation || 0
    } as CIInstructor : undefined,
    title: row.title,
    slug: row.slug || row.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
    url: row.url || row.course_url || '',
    difficulty: row.difficulty || row.difficulty_level || 1,
    durationHours: parseFloat(row.duration_hours || row.estimated_hours || '0')
  };
};

// Calculate CRI score from components
export const calculateCRI = (components: Array<{ current: number; target: number; weight: number }>): number => {
  if (components.length === 0) return 0;
  
  const weightedSum = components.reduce((sum, comp) => {
    const progress = Math.min(comp.current / comp.target, 1.0);
    return sum + progress * comp.weight;
  }, 0);
  
  const totalWeight = components.reduce((sum, comp) => sum + comp.weight, 0);
  return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
};

// Generate recommendation score
export const calculateRecommendationScore = (
  criDelta: number,
  instructorReputation: number,
  difficultyMatch: number,
  platformReliability: number
): number => {
  return blend(
    [criDelta / 10, 0.4],        // CRI improvement impact (40%)
    [instructorReputation / 5, 0.25], // Instructor quality (25%)
    [difficultyMatch, 0.2],       // Difficulty appropriateness (20%)
    [platformReliability, 0.15]   // Platform reliability (15%)
  );
};

// Format duration for display
export const formatDuration = (hours: number): string => {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
};

// Get difficulty color class
export const getDifficultyColor = (level: number): string => {
  switch (level) {
    case 1: return 'bg-green-100 text-green-800';
    case 2: return 'bg-blue-100 text-blue-800';
    case 3: return 'bg-yellow-100 text-yellow-800';
    case 4: return 'bg-orange-100 text-orange-800';
    case 5: return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Get difficulty label
export const getDifficultyLabel = (level: number): string => {
  switch (level) {
    case 1: return 'Beginner';
    case 2: return 'Elementary';
    case 3: return 'Intermediate';
    case 4: return 'Advanced';
    case 5: return 'Expert';
    default: return 'Unknown';
  }
};