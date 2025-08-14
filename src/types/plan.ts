export type SaveToPlanType = 'course' | 'career_path' | 'mentor' | 'skill' | 'project' | 'quick_win' | 'micro_task';

export interface SaveToPlanItem {
  type: SaveToPlanType;
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  priority?: 'high' | 'medium' | 'low';
  estimatedTimeToComplete?: string;       // keep for DB insert parity
  timeEstimate?: string;                  // optional alias for UI payloads
  skillTags?: string[];
}