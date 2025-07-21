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
      ai_resume_drafts: {
        Row: {
          content: Json
          created_at: string
          cri_average: number | null
          cri_feedback: Json | null
          id: string
          improvement_suggestions: string[] | null
          published_to_profile: boolean | null
          readiness_score: number | null
          scored_at: string | null
          submitted_for_cri: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          cri_average?: number | null
          cri_feedback?: Json | null
          id?: string
          improvement_suggestions?: string[] | null
          published_to_profile?: boolean | null
          readiness_score?: number | null
          scored_at?: string | null
          submitted_for_cri?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          cri_average?: number | null
          cri_feedback?: Json | null
          id?: string
          improvement_suggestions?: string[] | null
          published_to_profile?: boolean | null
          readiness_score?: number | null
          scored_at?: string | null
          submitted_for_cri?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badge_types: {
        Row: {
          active: boolean
          background_color: string | null
          color: string | null
          created_at: string
          created_by: string | null
          criteria_type: string | null
          criteria_value: Json | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          background_color?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          criteria_type?: string | null
          criteria_value?: Json | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          background_color?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          criteria_type?: string | null
          criteria_value?: Json | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          description: string
          emoji: string
          id: string
          name: string
          slug: string
          threshold: number | null
          trigger_type: string
        }
        Insert: {
          created_at?: string
          description: string
          emoji: string
          id?: string
          name: string
          slug: string
          threshold?: number | null
          trigger_type: string
        }
        Update: {
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          name?: string
          slug?: string
          threshold?: number | null
          trigger_type?: string
        }
        Relationships: []
      }
      career_goals: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          target_date: string | null
          target_role: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          target_date?: string | null
          target_role?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          target_date?: string | null
          target_role?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_location_multipliers: {
        Row: {
          career_path_id: string
          created_at: string | null
          id: string
          location_id: string
          salary_multiplier: number
          updated_at: string | null
        }
        Insert: {
          career_path_id: string
          created_at?: string | null
          id?: string
          location_id: string
          salary_multiplier: number
          updated_at?: string | null
        }
        Update: {
          career_path_id?: string
          created_at?: string | null
          id?: string
          location_id?: string
          salary_multiplier?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_location_multipliers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      continent_bounds: {
        Row: {
          bounds: Json
          continent: string
          created_at: string
          id: string
        }
        Insert: {
          bounds: Json
          continent: string
          created_at?: string
          id?: string
        }
        Update: {
          bounds?: Json
          continent?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      course_skill_map: {
        Row: {
          course_id: string
          created_at: string
          id: string
          skill_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          skill_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_skill_map_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "recommended_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_skill_map_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
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
      goal_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string | null
          created_at: string
          description: string | null
          goal_id: string
          id: string
          order_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "recommended_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "career_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          continent: string
          coordinates: Json
          cost_of_living: number
          country_code: string
          created_at: string
          emoji: string
          id: string
          job_icon: string
          job_market: string
          label: string
          salary_multiplier: number
          updated_at: string
          value: string
          visa_eligibility: Json
        }
        Insert: {
          active?: boolean
          continent: string
          coordinates: Json
          cost_of_living?: number
          country_code: string
          created_at?: string
          emoji: string
          id?: string
          job_icon: string
          job_market: string
          label: string
          salary_multiplier?: number
          updated_at?: string
          value: string
          visa_eligibility?: Json
        }
        Update: {
          active?: boolean
          continent?: string
          coordinates?: Json
          cost_of_living?: number
          country_code?: string
          created_at?: string
          emoji?: string
          id?: string
          job_icon?: string
          job_market?: string
          label?: string
          salary_multiplier?: number
          updated_at?: string
          value?: string
          visa_eligibility?: Json
        }
        Relationships: []
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
      milestone_plans: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string
          description: string | null
          id: string
          status: string
          steps: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          steps?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          steps?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role: string | null
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
          role?: string | null
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
          role?: string | null
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
      recommended_courses: {
        Row: {
          active: boolean | null
          cost: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          is_ai_recommended: boolean | null
          mentor_id: string
          platform: string
          reasoning: string | null
          skill_tags: string[] | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean | null
          cost?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_ai_recommended?: boolean | null
          mentor_id: string
          platform: string
          reasoning?: string | null
          skill_tags?: string[] | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean | null
          cost?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_ai_recommended?: boolean | null
          mentor_id?: string
          platform?: string
          reasoning?: string | null
          skill_tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string | null
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
      saved_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "recommended_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_graph_edges: {
        Row: {
          created_at: string
          id: string
          prerequisite_skill_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prerequisite_skill_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prerequisite_skill_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_graph_edges_prerequisite_skill_id_fkey"
            columns: ["prerequisite_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_graph_edges_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty_level: number | null
          id: string
          name: string
          slug: string
          updated_at: string
          xp_value: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          xp_value?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          xp_value?: number | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          created_at: string
          credits: number | null
          cri_score: number | null
          description: string | null
          difficulty: string | null
          grade: string | null
          id: string
          skill_tags: string[] | null
          title: string
          updated_at: string
          use_in_resume: boolean | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          credits?: number | null
          cri_score?: number | null
          description?: string | null
          difficulty?: string | null
          grade?: string | null
          id?: string
          skill_tags?: string[] | null
          title: string
          updated_at?: string
          use_in_resume?: boolean | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          credits?: number | null
          cri_score?: number | null
          description?: string | null
          difficulty?: string | null
          grade?: string | null
          id?: string
          skill_tags?: string[] | null
          title?: string
          updated_at?: string
          use_in_resume?: boolean | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges_old: {
        Row: {
          active: boolean
          assigned_by: string | null
          assigned_reason: string | null
          badge_type_id: string
          created_at: string
          id: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          assigned_by?: string | null
          assigned_reason?: string | null
          badge_type_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          assigned_reason?: string | null
          badge_type_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_type_id_fkey"
            columns: ["badge_type_id"]
            isOneToOne: false
            referencedRelation: "badge_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skill_progress: {
        Row: {
          created_at: string
          cri_score: number | null
          id: string
          skill_id: string
          status: string
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_source: string | null
          xp_earned: number | null
        }
        Insert: {
          created_at?: string
          cri_score?: number | null
          id?: string
          skill_id: string
          status?: string
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_source?: string | null
          xp_earned?: number | null
        }
        Update: {
          created_at?: string
          cri_score?: number | null
          id?: string
          skill_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_source?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skill_progress_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          total_xp: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          total_xp?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          total_xp?: number
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          action_type: string
          created_at: string
          id: string
          reason: string
          source_id: string | null
          user_id: string
          xp_amount: number
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          reason: string
          source_id?: string | null
          user_id: string
          xp_amount: number
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          reason?: string
          source_id?: string | null
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: {
        Args: {
          user_id_param: string
          xp_amount_param: number
          action_type_param: string
          reason_param: string
          source_id_param?: string
        }
        Returns: undefined
      }
      generate_user_roadmap: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_badge_for_user: {
        Args: { badge_slug: string; user_uuid?: string }
        Returns: {
          id: string
          name: string
          slug: string
          emoji: string
          trigger_type: string
          description: string
          threshold: number
          user_has_earned: boolean
          earned_at: string
        }[]
      }
      get_demo_resume_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          name: string
          email: string
          resume_id: string
          created_at: string
          slug: string
          total_xp: number
          current_level: number
          earned_badges: Json
        }[]
      }
      get_user_level: {
        Args: { user_id_param: string }
        Returns: {
          user_id: string
          total_xp: number
          current_level: number
          xp_for_current_level: number
          xp_for_next_level: number
          xp_progress_in_level: number
        }[]
      }
      get_user_role: {
        Args: { user_id_param: string }
        Returns: string
      }
      suggest_badges_for_user: {
        Args: { user_uuid: string }
        Returns: {
          badge_id: string
          slug: string
          name: string
          emoji: string
          reason: string
        }[]
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
