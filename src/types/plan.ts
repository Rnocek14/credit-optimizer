export type SaveToPlanType = 'course' | 'career_path' | 'mentor' | 'skill' | 'project' | 'quick_win' | 'micro_task';

// Unified SaveToPlanItem interface
export interface SaveToPlanItem {
  type: SaveToPlanType;
  id: string;
  title: string;
  description?: string;
  timeEstimate?: string;
  skillTags?: string[];
  priority?: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}