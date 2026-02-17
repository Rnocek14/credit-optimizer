/**
 * Core user primitives — track-scoped from day 1.
 */

export interface TrackSelection {
  activeTrackId: string | null;
  selectedTrackIds?: string[];
}

export interface UserProgress {
  userId: string;
  tracks: TrackSelection;
  xpTotal: number;
  xpByTrack: Record<string, number>;
  badgesEarned: string[];
}
