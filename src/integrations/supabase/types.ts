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
      ai_operation_cache: {
        Row: {
          confidence_score: number | null
          created_at: string
          expires_at: string
          id: string
          input_hash: string
          operation_type: string
          result_data: Json
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          expires_at: string
          id?: string
          input_hash: string
          operation_type: string
          result_data: Json
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          input_hash?: string
          operation_type?: string
          result_data?: Json
        }
        Relationships: []
      }
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
      career_graph_edges: {
        Row: {
          created_at: string | null
          data_source: string | null
          difficulty_multiplier: number | null
          edge_type: string
          from_id: string
          from_type: string
          id: string
          importance_weight: number | null
          last_validated: string | null
          monetary_cost: number | null
          pivot_via: string | null
          reasoning: string | null
          roi_score: number | null
          substitution_group_id: string | null
          success_rate: number | null
          time_cost_hours: number | null
          to_id: string
          to_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source?: string | null
          difficulty_multiplier?: number | null
          edge_type: string
          from_id: string
          from_type: string
          id?: string
          importance_weight?: number | null
          last_validated?: string | null
          monetary_cost?: number | null
          pivot_via?: string | null
          reasoning?: string | null
          roi_score?: number | null
          substitution_group_id?: string | null
          success_rate?: number | null
          time_cost_hours?: number | null
          to_id: string
          to_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source?: string | null
          difficulty_multiplier?: number | null
          edge_type?: string
          from_id?: string
          from_type?: string
          id?: string
          importance_weight?: number | null
          last_validated?: string | null
          monetary_cost?: number | null
          pivot_via?: string | null
          reasoning?: string | null
          roi_score?: number | null
          substitution_group_id?: string | null
          success_rate?: number | null
          time_cost_hours?: number | null
          to_id?: string
          to_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      career_graph_nodes: {
        Row: {
          active: boolean | null
          ai_confidence_score: number | null
          ai_generated_description: string | null
          category: string | null
          cost_estimate: number | null
          created_at: string
          description: string | null
          difficulty_level: number | null
          estimated_time_hours: number | null
          id: string
          last_analyzed: string | null
          node_type: string
          original_id: string | null
          original_table: string | null
          semantic_tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          ai_confidence_score?: number | null
          ai_generated_description?: string | null
          category?: string | null
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          estimated_time_hours?: number | null
          id?: string
          last_analyzed?: string | null
          node_type: string
          original_id?: string | null
          original_table?: string | null
          semantic_tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          ai_confidence_score?: number | null
          ai_generated_description?: string | null
          category?: string | null
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          estimated_time_hours?: number | null
          id?: string
          last_analyzed?: string | null
          node_type?: string
          original_id?: string | null
          original_table?: string | null
          semantic_tags?: string[] | null
          title?: string
          updated_at?: string
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
          checkpoint_skill_id: string | null
          common_entry_roles: string[] | null
          created_at: string
          education_required: string | null
          growth_outlook: string | null
          id: string
          industry: string | null
          key_skills: string[] | null
          level: string | null
          optional_skill_ids: string[] | null
          required_skill_ids: string[] | null
          roi_score: number | null
          summary: string | null
          title: string
          track: string | null
          updated_at: string
        }
        Insert: {
          advanced_roles?: string[] | null
          average_salary?: number | null
          certifications?: string[] | null
          checkpoint_skill_id?: string | null
          common_entry_roles?: string[] | null
          created_at?: string
          education_required?: string | null
          growth_outlook?: string | null
          id?: string
          industry?: string | null
          key_skills?: string[] | null
          level?: string | null
          optional_skill_ids?: string[] | null
          required_skill_ids?: string[] | null
          roi_score?: number | null
          summary?: string | null
          title: string
          track?: string | null
          updated_at?: string
        }
        Update: {
          advanced_roles?: string[] | null
          average_salary?: number | null
          certifications?: string[] | null
          checkpoint_skill_id?: string | null
          common_entry_roles?: string[] | null
          created_at?: string
          education_required?: string | null
          growth_outlook?: string | null
          id?: string
          industry?: string | null
          key_skills?: string[] | null
          level?: string | null
          optional_skill_ids?: string[] | null
          required_skill_ids?: string[] | null
          roi_score?: number | null
          summary?: string | null
          title?: string
          track?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      career_step_skills: {
        Row: {
          created_at: string | null
          id: string
          importance_score: number | null
          skill_id: string | null
          step_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          importance_score?: number | null
          skill_id?: string | null
          step_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          importance_score?: number | null
          skill_id?: string | null
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_step_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_step_skills_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "career_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      career_steps: {
        Row: {
          career_path_id: string | null
          created_at: string
          description: string | null
          estimated_cost: string | null
          estimated_time: string | null
          id: string
          is_terminal: boolean | null
          linked_job_titles: string[] | null
          prerequisites: string[] | null
          proof_method: string | null
          skill_ids: string[] | null
          step_order: number
          step_type: string | null
          substitutions: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          career_path_id?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: string | null
          estimated_time?: string | null
          id?: string
          is_terminal?: boolean | null
          linked_job_titles?: string[] | null
          prerequisites?: string[] | null
          proof_method?: string | null
          skill_ids?: string[] | null
          step_order: number
          step_type?: string | null
          substitutions?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          career_path_id?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: string | null
          estimated_time?: string | null
          id?: string
          is_terminal?: boolean | null
          linked_job_titles?: string[] | null
          prerequisites?: string[] | null
          proof_method?: string | null
          skill_ids?: string[] | null
          step_order?: number
          step_type?: string | null
          substitutions?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_steps_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
        ]
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
      certification_skills: {
        Row: {
          certification_id: string | null
          created_at: string | null
          id: string
          importance_weight: number | null
          skill_id: string | null
          validation_level: string | null
        }
        Insert: {
          certification_id?: string | null
          created_at?: string | null
          id?: string
          importance_weight?: number | null
          skill_id?: string | null
          validation_level?: string | null
        }
        Update: {
          certification_id?: string | null
          created_at?: string | null
          id?: string
          importance_weight?: number | null
          skill_id?: string | null
          validation_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_skills_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          exam_url: string | null
          id: string
          industry_recognition: string | null
          issuer: string
          prep_time_hours: number | null
          skills_validated: string[] | null
          title: string
          updated_at: string | null
          validity_years: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          exam_url?: string | null
          id?: string
          industry_recognition?: string | null
          issuer: string
          prep_time_hours?: number | null
          skills_validated?: string[] | null
          title: string
          updated_at?: string | null
          validity_years?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          exam_url?: string | null
          id?: string
          industry_recognition?: string | null
          issuer?: string
          prep_time_hours?: number | null
          skills_validated?: string[] | null
          title?: string
          updated_at?: string | null
          validity_years?: number | null
        }
        Relationships: []
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
      job_outcomes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          next_path_ids: string[] | null
          preferred_cri: number | null
          region_availability: string[] | null
          required_skills: string[] | null
          salary_range: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          next_path_ids?: string[] | null
          preferred_cri?: number | null
          region_availability?: string[] | null
          required_skills?: string[] | null
          salary_range?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          next_path_ids?: string[] | null
          preferred_cri?: number | null
          region_availability?: string[] | null
          required_skills?: string[] | null
          salary_range?: string | null
          title?: string
        }
        Relationships: []
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
      market_alerts: {
        Row: {
          alert_message: string
          alert_type: string
          career_path: string
          created_at: string
          current_value: number | null
          id: string
          is_read: boolean | null
          location: string
          previous_value: number | null
          threshold_value: number | null
          triggered_at: string
          user_id: string
        }
        Insert: {
          alert_message: string
          alert_type: string
          career_path: string
          created_at?: string
          current_value?: number | null
          id?: string
          is_read?: boolean | null
          location: string
          previous_value?: number | null
          threshold_value?: number | null
          triggered_at?: string
          user_id: string
        }
        Update: {
          alert_message?: string
          alert_type?: string
          career_path?: string
          created_at?: string
          current_value?: number | null
          id?: string
          is_read?: boolean | null
          location?: string
          previous_value?: number | null
          threshold_value?: number | null
          triggered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_trends: {
        Row: {
          ai_insights: Json | null
          average_salary: number | null
          career_path: string
          career_path_id: string | null
          competition_level: string | null
          created_at: string
          data_source: string | null
          demand_score: number | null
          growth_rate: number | null
          id: string
          job_postings_count: number | null
          location: string
          location_id: string | null
          raw_data: Json | null
          time_period: string | null
          updated_at: string
        }
        Insert: {
          ai_insights?: Json | null
          average_salary?: number | null
          career_path: string
          career_path_id?: string | null
          competition_level?: string | null
          created_at?: string
          data_source?: string | null
          demand_score?: number | null
          growth_rate?: number | null
          id?: string
          job_postings_count?: number | null
          location: string
          location_id?: string | null
          raw_data?: Json | null
          time_period?: string | null
          updated_at?: string
        }
        Update: {
          ai_insights?: Json | null
          average_salary?: number | null
          career_path?: string
          career_path_id?: string | null
          competition_level?: string | null
          created_at?: string
          data_source?: string | null
          demand_score?: number | null
          growth_rate?: number | null
          id?: string
          job_postings_count?: number | null
          location?: string
          location_id?: string | null
          raw_data?: Json | null
          time_period?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_market_trends_career_path"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_market_trends_location"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      market_trends_history: {
        Row: {
          ai_insights: Json | null
          average_salary: number | null
          career_path: string
          competition_level: string | null
          created_at: string
          data_source: string | null
          demand_score: number | null
          growth_rate: number | null
          id: string
          job_postings_count: number | null
          location: string
          market_trend_id: string
          raw_data: Json | null
          recorded_at: string
          time_period: string | null
        }
        Insert: {
          ai_insights?: Json | null
          average_salary?: number | null
          career_path: string
          competition_level?: string | null
          created_at?: string
          data_source?: string | null
          demand_score?: number | null
          growth_rate?: number | null
          id?: string
          job_postings_count?: number | null
          location: string
          market_trend_id: string
          raw_data?: Json | null
          recorded_at?: string
          time_period?: string | null
        }
        Update: {
          ai_insights?: Json | null
          average_salary?: number | null
          career_path?: string
          competition_level?: string | null
          created_at?: string
          data_source?: string | null
          demand_score?: number | null
          growth_rate?: number | null
          id?: string
          job_postings_count?: number | null
          location?: string
          market_trend_id?: string
          raw_data?: Json | null
          recorded_at?: string
          time_period?: string | null
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
      pivot_exploration_events: {
        Row: {
          current_career: string
          estimated_cost: string | null
          estimated_time: string | null
          id: string
          missing_skills: string[]
          pivoted_career: string
          reasoning: string | null
          roi_score: number | null
          shared_skills: string[]
          timestamp: string
          user_id: string
        }
        Insert: {
          current_career: string
          estimated_cost?: string | null
          estimated_time?: string | null
          id?: string
          missing_skills?: string[]
          pivoted_career: string
          reasoning?: string | null
          roi_score?: number | null
          shared_skills?: string[]
          timestamp?: string
          user_id: string
        }
        Update: {
          current_career?: string
          estimated_cost?: string | null
          estimated_time?: string | null
          id?: string
          missing_skills?: string[]
          pivoted_career?: string
          reasoning?: string | null
          roi_score?: number | null
          shared_skills?: string[]
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      pivot_points: {
        Row: {
          average_salary_change: number | null
          created_at: string | null
          estimated_cost: number | null
          estimated_transition_time: string | null
          from_job_id: string | null
          id: string
          intermediate_roles: string[] | null
          market_demand_score: number | null
          pivot_mechanism: string | null
          pivot_type: string | null
          reasoning: string | null
          recommended_courses: string[] | null
          required_skills: string[] | null
          roi_score: number | null
          skill_overlap_percentage: number | null
          success_rate: number | null
          to_job_id: string | null
          updated_at: string | null
        }
        Insert: {
          average_salary_change?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          estimated_transition_time?: string | null
          from_job_id?: string | null
          id?: string
          intermediate_roles?: string[] | null
          market_demand_score?: number | null
          pivot_mechanism?: string | null
          pivot_type?: string | null
          reasoning?: string | null
          recommended_courses?: string[] | null
          required_skills?: string[] | null
          roi_score?: number | null
          skill_overlap_percentage?: number | null
          success_rate?: number | null
          to_job_id?: string | null
          updated_at?: string | null
        }
        Update: {
          average_salary_change?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          estimated_transition_time?: string | null
          from_job_id?: string | null
          id?: string
          intermediate_roles?: string[] | null
          market_demand_score?: number | null
          pivot_mechanism?: string | null
          pivot_type?: string | null
          reasoning?: string | null
          recommended_courses?: string[] | null
          required_skills?: string[] | null
          roi_score?: number | null
          skill_overlap_percentage?: number | null
          success_rate?: number | null
          to_job_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pivot_points_from_job_id_fkey"
            columns: ["from_job_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pivot_points_to_job_id_fkey"
            columns: ["to_job_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
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
      project_skills: {
        Row: {
          created_at: string | null
          demonstration_level: string | null
          id: string
          importance_weight: number | null
          project_id: string | null
          skill_id: string | null
        }
        Insert: {
          created_at?: string | null
          demonstration_level?: string | null
          id?: string
          importance_weight?: number | null
          project_id?: string | null
          skill_id?: string | null
        }
        Update: {
          created_at?: string | null
          demonstration_level?: string | null
          id?: string
          importance_weight?: number | null
          project_id?: string | null
          skill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_skills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          demo_url: string | null
          description: string | null
          difficulty: string | null
          estimated_time_hours: number | null
          github_url: string | null
          id: string
          project_type: string | null
          skills_demonstrated: string[] | null
          technologies: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          demo_url?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_time_hours?: number | null
          github_url?: string | null
          id?: string
          project_type?: string | null
          skills_demonstrated?: string[] | null
          technologies?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          demo_url?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_time_hours?: number | null
          github_url?: string | null
          id?: string
          project_type?: string | null
          skills_demonstrated?: string[] | null
          technologies?: string[] | null
          title?: string
          updated_at?: string | null
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
      roadmap_step_skills: {
        Row: {
          created_at: string
          id: string
          roadmap_step_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          roadmap_step_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          roadmap_step_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_step_skills_roadmap_step_id_fkey"
            columns: ["roadmap_step_id"]
            isOneToOne: false
            referencedRelation: "roadmap_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_step_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_steps: {
        Row: {
          career_path_id: string | null
          category: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_duration: string | null
          id: string
          is_capstone: boolean | null
          is_checkpoint: boolean | null
          order_index: number | null
          prerequisites: string[] | null
          priority: string | null
          skill_keywords: string[] | null
          success_metrics: string | null
          timeline: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          career_path_id?: string | null
          category?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_capstone?: boolean | null
          is_checkpoint?: boolean | null
          order_index?: number | null
          prerequisites?: string[] | null
          priority?: string | null
          skill_keywords?: string[] | null
          success_metrics?: string | null
          timeline?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          career_path_id?: string | null
          category?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_capstone?: boolean | null
          is_checkpoint?: boolean | null
          order_index?: number | null
          prerequisites?: string[] | null
          priority?: string | null
          skill_keywords?: string[] | null
          success_metrics?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_steps_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_insights: {
        Row: {
          career_path_id: string
          created_at: string
          created_by: string | null
          data_source: string | null
          experience_level: string
          id: string
          location_id: string
          notes: string | null
          reported_salary: number
          source: string
        }
        Insert: {
          career_path_id: string
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          experience_level: string
          id?: string
          location_id: string
          notes?: string | null
          reported_salary: number
          source: string
        }
        Update: {
          career_path_id?: string
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          experience_level?: string
          id?: string
          location_id?: string
          notes?: string | null
          reported_salary?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_insights_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_insights_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      skill_branches: {
        Row: {
          created_at: string
          from_skill_id: string
          id: string
          reasoning: string | null
          recommended: boolean
          to_skill_id: string
          type: string
        }
        Insert: {
          created_at?: string
          from_skill_id: string
          id?: string
          reasoning?: string | null
          recommended?: boolean
          to_skill_id: string
          type: string
        }
        Update: {
          created_at?: string
          from_skill_id?: string
          id?: string
          reasoning?: string | null
          recommended?: boolean
          to_skill_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_branches_from_skill_id_fkey"
            columns: ["from_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_branches_to_skill_id_fkey"
            columns: ["to_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
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
      step_equivalents: {
        Row: {
          created_at: string | null
          cri_difference: number | null
          equivalent_step_id: string | null
          id: string
          match_reason: string | null
          skill_overlap_percentage: number | null
          step_id: string | null
        }
        Insert: {
          created_at?: string | null
          cri_difference?: number | null
          equivalent_step_id?: string | null
          id?: string
          match_reason?: string | null
          skill_overlap_percentage?: number | null
          step_id?: string | null
        }
        Update: {
          created_at?: string | null
          cri_difference?: number | null
          equivalent_step_id?: string | null
          id?: string
          match_reason?: string | null
          skill_overlap_percentage?: number | null
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_equivalents_equivalent_step_id_fkey"
            columns: ["equivalent_step_id"]
            isOneToOne: false
            referencedRelation: "career_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_equivalents_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "career_steps"
            referencedColumns: ["id"]
          },
        ]
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
      user_career_progress: {
        Row: {
          completion_date: string | null
          created_at: string | null
          cri_contribution: number | null
          id: string
          importance_to_goal: number | null
          node_id: string
          node_type: string
          notes: string | null
          priority_level: number | null
          progress_percentage: number | null
          status: string
          target_completion_date: string | null
          updated_at: string | null
          user_id: string
          verification_method: string | null
          verification_url: string | null
        }
        Insert: {
          completion_date?: string | null
          created_at?: string | null
          cri_contribution?: number | null
          id?: string
          importance_to_goal?: number | null
          node_id: string
          node_type: string
          notes?: string | null
          priority_level?: number | null
          progress_percentage?: number | null
          status: string
          target_completion_date?: string | null
          updated_at?: string | null
          user_id: string
          verification_method?: string | null
          verification_url?: string | null
        }
        Update: {
          completion_date?: string | null
          created_at?: string | null
          cri_contribution?: number | null
          id?: string
          importance_to_goal?: number | null
          node_id?: string
          node_type?: string
          notes?: string | null
          priority_level?: number | null
          progress_percentage?: number | null
          status?: string
          target_completion_date?: string | null
          updated_at?: string | null
          user_id?: string
          verification_method?: string | null
          verification_url?: string | null
        }
        Relationships: []
      }
      user_career_selections: {
        Row: {
          career_path_id: string
          checkpoint_reached: boolean | null
          created_at: string
          id: string
          is_active: boolean
          pivot_choices: Json | null
          selected_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          career_path_id: string
          checkpoint_reached?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean
          pivot_choices?: Json | null
          selected_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          career_path_id?: string
          checkpoint_reached?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean
          pivot_choices?: Json | null
          selected_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_career_selections_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cri_scores: {
        Row: {
          blocking_factors: string[] | null
          certification_completion_percentage: number | null
          created_at: string | null
          current_cri_score: number | null
          estimated_time_to_ready: string | null
          experience_score: number | null
          experience_years: number | null
          id: string
          last_calculated: string | null
          next_priority_items: string[] | null
          project_completion_percentage: number | null
          readiness_level: string | null
          required_cri_score: number | null
          skill_completion_percentage: number | null
          step_completion_percentage: number | null
          target_job_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blocking_factors?: string[] | null
          certification_completion_percentage?: number | null
          created_at?: string | null
          current_cri_score?: number | null
          estimated_time_to_ready?: string | null
          experience_score?: number | null
          experience_years?: number | null
          id?: string
          last_calculated?: string | null
          next_priority_items?: string[] | null
          project_completion_percentage?: number | null
          readiness_level?: string | null
          required_cri_score?: number | null
          skill_completion_percentage?: number | null
          step_completion_percentage?: number | null
          target_job_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blocking_factors?: string[] | null
          certification_completion_percentage?: number | null
          created_at?: string | null
          current_cri_score?: number | null
          estimated_time_to_ready?: string | null
          experience_score?: number | null
          experience_years?: number | null
          id?: string
          last_calculated?: string | null
          next_priority_items?: string[] | null
          project_completion_percentage?: number | null
          readiness_level?: string | null
          required_cri_score?: number | null
          skill_completion_percentage?: number | null
          step_completion_percentage?: number | null
          target_job_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cri_scores_target_job_id_fkey"
            columns: ["target_job_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      user_market_preferences: {
        Row: {
          alert_enabled: boolean | null
          alert_frequency: string | null
          created_at: string
          id: string
          preferred_careers: string[] | null
          preferred_locations: string[] | null
          salary_range_max: number | null
          salary_range_min: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean | null
          alert_frequency?: string | null
          created_at?: string
          id?: string
          preferred_careers?: string[] | null
          preferred_locations?: string[] | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_enabled?: boolean | null
          alert_frequency?: string | null
          created_at?: string
          id?: string
          preferred_careers?: string[] | null
          preferred_locations?: string[] | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_step_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          status: string | null
          step_id: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          step_id?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          step_id?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_step_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "career_steps"
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
      calculate_career_step_levels: {
        Args: { career_path_id_param: string }
        Returns: {
          id: string
          title: string
          description: string
          step_order: number
          prerequisites: string[]
          level: number
          career_path_id: string
          is_terminal: boolean
          estimated_duration: string
          completed: boolean
          created_at: string
          updated_at: string
        }[]
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
      refresh_career_steps_with_levels: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
