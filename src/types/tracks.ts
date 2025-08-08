
export interface CareerTrack {
  id: string;
  user_id: string;
  track_name: string | null;
  title?: string | null;
  goal?: string | null;
  icon?: string | null;
  color?: string | null;
  archived: boolean;
  order_index: number;
  description?: string | null;
  growth_potential?: string | null;
  time_to_proficiency?: string | null;
  reasoning?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateTrackInput {
  track_name: string;
  goal?: string;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateTrackInput {
  track_name?: string;
  goal?: string | null;
  icon?: string | null;
  color?: string | null;
  archived?: boolean;
  order_index?: number;
}
