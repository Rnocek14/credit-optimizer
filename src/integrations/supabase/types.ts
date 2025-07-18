export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      career_paths: {
        Row: {
          advanced_roles: string[] | null
          average_salary: number | null
          certifications: string[] | null
          common_entry_roles: string[] | null
          created_at: string
          education_required: string | null
          growth_outlook: string | null
          id: string
          industry: string | null
          key_skills: string[] | null
          level: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          advanced_roles?: string[] | null
          average_salary?: number | null
          certifications?: string[] | null
          common_entry_roles?: string[] | null
          created_at?: string
          education_required?: string | null
          growth_outlook?: string | null
          id?: string
          industry?: string | null
          key_skills?: string[] | null
          level?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          advanced_roles?: string[] | null
          average_salary?: number | null
          certifications?: string[] | null
          common_entry_roles?: string[] | null
          created_at?: string
          education_required?: string | null
          growth_outlook?: string | null
          id?: string
          industry?: string | null
          key_skills?: string[] | null
          level?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      career_tracks: {
        Row: {
          created_at: string
          description: string | null
          growth_potential: string | null
          id: string
          reasoning: string | null
          time_to_proficiency: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          growth_potential?: string | null
          id?: string
          reasoning?: string | null
          time_to_proficiency?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          growth_potential?: string | null
          id?: string
          reasoning?: string | null
          time_to_proficiency?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_tracks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_gallery_curations: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          curation_tag: string
          display_order: number | null
          id: string
          profile_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          curation_tag: string
          display_order?: number | null
          id?: string
          profile_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          curation_tag?: string
          display_order?: number | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_gallery_curations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_feedback: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          mentor_email: string
          rating: number
          recommend_for_gallery: boolean | null
          recommend_for_jobs: boolean | null
          resume_event_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          mentor_email: string
          rating: number
          recommend_for_gallery?: boolean | null
          recommend_for_jobs?: boolean | null
          resume_event_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          mentor_email?: string
          rating?: number
          recommend_for_gallery?: boolean | null
          recommend_for_jobs?: boolean | null
          resume_event_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_feedback_resume_event_id_fkey"
            columns: ["resume_event_id"]
            isOneToOne: false
            referencedRelation: "resume_shared_events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_reviewed_at: string | null
          availability: string | null
          career_goals: string | null
          created_at: string
          education: string | null
          experience_level: string | null
          gallery_enabled: boolean | null
          gallery_featured: boolean | null
          id: string
          industry: string | null
          interests: string[] | null
          learning_style: string | null
          location: string | null
          name: string | null
          resume_review_summary: string | null
          role_title: string | null
          salary_expectations: number | null
          skills: string[] | null
          updated_at: string
          user_id: string | null
          willing_to_relocate: boolean | null
          work_preferences: string | null
          years_experience: number | null
        }
        Insert: {
          ai_reviewed_at?: string | null
          availability?: string | null
          career_goals?: string | null
          created_at?: string
          education?: string | null
          experience_level?: string | null
          gallery_enabled?: boolean | null
          gallery_featured?: boolean | null
          id?: string
          industry?: string | null
          interests?: string[] | null
          learning_style?: string | null
          location?: string | null
          name?: string | null
          resume_review_summary?: string | null
          role_title?: string | null
          salary_expectations?: number | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string | null
          willing_to_relocate?: boolean | null
          work_preferences?: string | null
          years_experience?: number | null
        }
        Update: {
          ai_reviewed_at?: string | null
          availability?: string | null
          career_goals?: string | null
          created_at?: string
          education?: string | null
          experience_level?: string | null
          gallery_enabled?: boolean | null
          gallery_featured?: boolean | null
          id?: string
          industry?: string | null
          interests?: string[] | null
          learning_style?: string | null
          location?: string | null
          name?: string | null
          resume_review_summary?: string | null
          role_title?: string | null
          salary_expectations?: number | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string | null
          willing_to_relocate?: boolean | null
          work_preferences?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      resume_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resume_shared_events: {
        Row: {
          ai_review_data: Json | null
          created_at: string
          id: string
          resume_data: Json | null
          shared_at: string
          shared_with_email: string
          user_id: string
        }
        Insert: {
          ai_review_data?: Json | null
          created_at?: string
          id?: string
          resume_data?: Json | null
          shared_at?: string
          shared_with_email: string
          user_id: string
        }
        Update: {
          ai_review_data?: Json | null
          created_at?: string
          id?: string
          resume_data?: Json | null
          shared_at?: string
          shared_with_email?: string
          user_id?: string
        }
        Relationships: []
      }
      roadmap_steps: {
        Row: {
          category: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_duration: string | null
          id: string
          order_index: number | null
          prerequisites: string[] | null
          priority: string | null
          success_metrics: string | null
          timeline: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          order_index?: number | null
          prerequisites?: string[] | null
          priority?: string | null
          success_metrics?: string | null
          timeline?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          order_index?: number | null
          prerequisites?: string[] | null
          priority?: string | null
          success_metrics?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_user_roadmap: {
        Args: { user_id_param: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
