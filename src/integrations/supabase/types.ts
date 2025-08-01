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
      alert_configurations: {
        Row: {
          alert_type: string
          career_path: string
          comparison_operator: string
          created_at: string
          id: string
          is_active: boolean
          location: string
          metric_type: string
          name: string
          pattern_config: Json | null
          threshold_value: number | null
          time_window: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          career_path: string
          comparison_operator?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location: string
          metric_type: string
          name: string
          pattern_config?: Json | null
          threshold_value?: number | null
          time_window?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          career_path?: string
          comparison_operator?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string
          metric_type?: string
          name?: string
          pattern_config?: Json | null
          threshold_value?: number | null
          time_window?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          action_taken: string | null
          alert_config_id: string
          alert_message: string
          confidence_score: number | null
          created_at: string
          false_positive: boolean | null
          id: string
          is_read: boolean
          metric_value: number
          read_at: string | null
          threshold_value: number
          triggered_at: string
          user_feedback_rating: number | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          alert_config_id: string
          alert_message: string
          confidence_score?: number | null
          created_at?: string
          false_positive?: boolean | null
          id?: string
          is_read?: boolean
          metric_value: number
          read_at?: string | null
          threshold_value: number
          triggered_at?: string
          user_feedback_rating?: number | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          alert_config_id?: string
          alert_message?: string
          confidence_score?: number | null
          created_at?: string
          false_positive?: boolean | null
          id?: string
          is_read?: boolean
          metric_value?: number
          read_at?: string | null
          threshold_value?: number
          triggered_at?: string
          user_feedback_rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "alert_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_performance_metrics: {
        Row: {
          accuracy_rate: number | null
          alert_config_id: string
          avg_response_time_hours: number | null
          created_at: string
          false_positives: number | null
          id: string
          period_end: string
          period_start: string
          relevant_alerts: number | null
          total_alerts: number | null
          user_engagement_score: number | null
          user_id: string
        }
        Insert: {
          accuracy_rate?: number | null
          alert_config_id: string
          avg_response_time_hours?: number | null
          created_at?: string
          false_positives?: number | null
          id?: string
          period_end: string
          period_start: string
          relevant_alerts?: number | null
          total_alerts?: number | null
          user_engagement_score?: number | null
          user_id: string
        }
        Update: {
          accuracy_rate?: number | null
          alert_config_id?: string
          avg_response_time_hours?: number | null
          created_at?: string
          false_positives?: number | null
          id?: string
          period_end?: string
          period_start?: string
          relevant_alerts?: number | null
          total_alerts?: number | null
          user_engagement_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_performance_metrics_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "alert_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_detections: {
        Row: {
          anomaly_score: number
          anomaly_type: string
          baseline_value: number | null
          career_path: string
          created_at: string
          current_value: number | null
          detected_at: string
          deviation_percentage: number | null
          id: string
          location: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          anomaly_score?: number
          anomaly_type: string
          baseline_value?: number | null
          career_path: string
          created_at?: string
          current_value?: number | null
          detected_at?: string
          deviation_percentage?: number | null
          id?: string
          location: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          anomaly_score?: number
          anomaly_type?: string
          baseline_value?: number | null
          career_path?: string
          created_at?: string
          current_value?: number | null
          detected_at?: string
          deviation_percentage?: number | null
          id?: string
          location?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      autonomous_workflows: {
        Row: {
          completed_at: string | null
          config: Json
          context_data: Json
          created_at: string
          description: string | null
          estimated_duration_days: number | null
          id: string
          last_action_at: string | null
          priority: string
          progress_percentage: number | null
          started_at: string | null
          status: string
          target_completion_date: string | null
          target_outcome: string
          title: string
          updated_at: string
          user_id: string
          workflow_type: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          context_data?: Json
          created_at?: string
          description?: string | null
          estimated_duration_days?: number | null
          id?: string
          last_action_at?: string | null
          priority?: string
          progress_percentage?: number | null
          started_at?: string | null
          status?: string
          target_completion_date?: string | null
          target_outcome: string
          title: string
          updated_at?: string
          user_id: string
          workflow_type: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          context_data?: Json
          created_at?: string
          description?: string | null
          estimated_duration_days?: number | null
          id?: string
          last_action_at?: string | null
          priority?: string
          progress_percentage?: number | null
          started_at?: string | null
          status?: string
          target_completion_date?: string | null
          target_outcome?: string
          title?: string
          updated_at?: string
          user_id?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "autonomous_workflows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
          current_progress: number | null
          description: string | null
          estimated_timeline_weeks: number | null
          id: string
          market_demand_score: number | null
          priority_score: number | null
          skill_gaps: string[] | null
          target_date: string | null
          target_role: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          current_progress?: number | null
          description?: string | null
          estimated_timeline_weeks?: number | null
          id?: string
          market_demand_score?: number | null
          priority_score?: number | null
          skill_gaps?: string[] | null
          target_date?: string | null
          target_role?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          current_progress?: number | null
          description?: string | null
          estimated_timeline_weeks?: number | null
          id?: string
          market_demand_score?: number | null
          priority_score?: number | null
          skill_gaps?: string[] | null
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
          alternative_paths: string[] | null
          confidence_score: number | null
          created_at: string | null
          data_source: string | null
          difficulty_multiplier: number | null
          edge_type: string
          experience_level: string | null
          from_id: string
          from_type: string
          id: string
          importance_weight: number | null
          industry_specific: boolean | null
          is_validated: boolean | null
          last_validated: string | null
          location_specific: boolean | null
          monetary_cost: number | null
          pivot_via: string | null
          reasoning: string | null
          roi_score: number | null
          semantic_strength: number | null
          skill_transfer_rate: number | null
          substitution_group_id: string | null
          success_rate: number | null
          time_cost_hours: number | null
          to_id: string
          to_type: string
          updated_at: string | null
          validation_source: string | null
        }
        Insert: {
          alternative_paths?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          data_source?: string | null
          difficulty_multiplier?: number | null
          edge_type: string
          experience_level?: string | null
          from_id: string
          from_type: string
          id?: string
          importance_weight?: number | null
          industry_specific?: boolean | null
          is_validated?: boolean | null
          last_validated?: string | null
          location_specific?: boolean | null
          monetary_cost?: number | null
          pivot_via?: string | null
          reasoning?: string | null
          roi_score?: number | null
          semantic_strength?: number | null
          skill_transfer_rate?: number | null
          substitution_group_id?: string | null
          success_rate?: number | null
          time_cost_hours?: number | null
          to_id: string
          to_type: string
          updated_at?: string | null
          validation_source?: string | null
        }
        Update: {
          alternative_paths?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          data_source?: string | null
          difficulty_multiplier?: number | null
          edge_type?: string
          experience_level?: string | null
          from_id?: string
          from_type?: string
          id?: string
          importance_weight?: number | null
          industry_specific?: boolean | null
          is_validated?: boolean | null
          last_validated?: string | null
          location_specific?: boolean | null
          monetary_cost?: number | null
          pivot_via?: string | null
          reasoning?: string | null
          roi_score?: number | null
          semantic_strength?: number | null
          skill_transfer_rate?: number | null
          substitution_group_id?: string | null
          success_rate?: number | null
          time_cost_hours?: number | null
          to_id?: string
          to_type?: string
          updated_at?: string | null
          validation_source?: string | null
        }
        Relationships: []
      }
      career_graph_nodes: {
        Row: {
          active: boolean | null
          ai_confidence_score: number | null
          ai_generated_description: string | null
          category: string | null
          certification_body: string | null
          completion_rate: number | null
          cost_estimate: number | null
          created_at: string
          description: string | null
          difficulty_level: number | null
          estimated_time_hours: number | null
          expiry_period_months: number | null
          has_hands_on_projects: boolean | null
          id: string
          industry_alignment: Json | null
          instructor_rating: number | null
          last_analyzed: string | null
          location_multipliers: Json | null
          market_demand_score: number | null
          node_type: string
          original_id: string | null
          original_table: string | null
          platform_url: string | null
          prerequisite_ids: string[] | null
          salary_data: Json | null
          semantic_tags: string[] | null
          skill_validation_type: string | null
          substitution_group_id: string | null
          success_rate: number | null
          title: string
          trending_score: number | null
          updated_at: string
          visa_requirements: Json | null
        }
        Insert: {
          active?: boolean | null
          ai_confidence_score?: number | null
          ai_generated_description?: string | null
          category?: string | null
          certification_body?: string | null
          completion_rate?: number | null
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          estimated_time_hours?: number | null
          expiry_period_months?: number | null
          has_hands_on_projects?: boolean | null
          id?: string
          industry_alignment?: Json | null
          instructor_rating?: number | null
          last_analyzed?: string | null
          location_multipliers?: Json | null
          market_demand_score?: number | null
          node_type: string
          original_id?: string | null
          original_table?: string | null
          platform_url?: string | null
          prerequisite_ids?: string[] | null
          salary_data?: Json | null
          semantic_tags?: string[] | null
          skill_validation_type?: string | null
          substitution_group_id?: string | null
          success_rate?: number | null
          title: string
          trending_score?: number | null
          updated_at?: string
          visa_requirements?: Json | null
        }
        Update: {
          active?: boolean | null
          ai_confidence_score?: number | null
          ai_generated_description?: string | null
          category?: string | null
          certification_body?: string | null
          completion_rate?: number | null
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          estimated_time_hours?: number | null
          expiry_period_months?: number | null
          has_hands_on_projects?: boolean | null
          id?: string
          industry_alignment?: Json | null
          instructor_rating?: number | null
          last_analyzed?: string | null
          location_multipliers?: Json | null
          market_demand_score?: number | null
          node_type?: string
          original_id?: string | null
          original_table?: string | null
          platform_url?: string | null
          prerequisite_ids?: string[] | null
          salary_data?: Json | null
          semantic_tags?: string[] | null
          skill_validation_type?: string | null
          substitution_group_id?: string | null
          success_rate?: number | null
          title?: string
          trending_score?: number | null
          updated_at?: string
          visa_requirements?: Json | null
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
      career_monitoring_alerts: {
        Row: {
          acknowledged_at: string | null
          actioned_at: string | null
          alert_type: string
          auto_create_workflow: boolean | null
          category: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          recommended_actions: Json
          severity: string
          status: string
          title: string
          trigger_data: Json
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          actioned_at?: string | null
          alert_type: string
          auto_create_workflow?: boolean | null
          category: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          recommended_actions?: Json
          severity?: string
          status?: string
          title: string
          trigger_data?: Json
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          actioned_at?: string | null
          alert_type?: string
          auto_create_workflow?: boolean | null
          category?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          recommended_actions?: Json
          severity?: string
          status?: string
          title?: string
          trigger_data?: Json
          user_id?: string
        }
        Relationships: []
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
      career_progression_paths: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_progression: string[] | null
          experience_level: string | null
          id: string
          industry_focus: string | null
          location_optimized: string[] | null
          path_nodes: Json
          start_node_id: string | null
          success_metrics: Json | null
          target_node_id: string | null
          title: string
          total_estimated_cost: number | null
          total_estimated_hours: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_progression?: string[] | null
          experience_level?: string | null
          id?: string
          industry_focus?: string | null
          location_optimized?: string[] | null
          path_nodes?: Json
          start_node_id?: string | null
          success_metrics?: Json | null
          target_node_id?: string | null
          title: string
          total_estimated_cost?: number | null
          total_estimated_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_progression?: string[] | null
          experience_level?: string | null
          id?: string
          industry_focus?: string | null
          location_optimized?: string[] | null
          path_nodes?: Json
          start_node_id?: string | null
          success_metrics?: Json | null
          target_node_id?: string | null
          title?: string
          total_estimated_cost?: number | null
          total_estimated_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_progression_paths_start_node_id_fkey"
            columns: ["start_node_id"]
            isOneToOne: false
            referencedRelation: "career_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_progression_paths_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "career_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_context: {
        Row: {
          context_key: string
          context_type: string
          context_value: Json
          created_at: string
          expires_at: string | null
          id: string
          importance_score: number | null
          last_referenced_at: string | null
          user_id: string
        }
        Insert: {
          context_key: string
          context_type: string
          context_value: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          last_referenced_at?: string | null
          user_id: string
        }
        Update: {
          context_key?: string
          context_type?: string
          context_value?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          last_referenced_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          context: Json
          created_at: string
          feature: string
          id: string
          is_active: boolean
          last_activity_at: string
          title: string
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          feature?: string
          id?: string
          is_active?: boolean
          last_activity_at?: string
          title: string
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          feature?: string
          id?: string
          is_active?: boolean
          last_activity_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string | null
          completion_notes: string | null
          course_id: string
          created_at: string
          id: string
          last_accessed_at: string | null
          progress_percentage: number
          started_at: string | null
          status: string
          time_spent_hours: number | null
          updated_at: string
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          completed_at?: string | null
          completion_notes?: string | null
          course_id: string
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number
          started_at?: string | null
          status?: string
          time_spent_hours?: number | null
          updated_at?: string
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          completed_at?: string | null
          completion_notes?: string | null
          course_id?: string
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number
          started_at?: string | null
          status?: string
          time_spent_hours?: number | null
          updated_at?: string
          user_id?: string
          xp_awarded?: number | null
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
      course_submissions: {
        Row: {
          cost: number | null
          created_at: string
          cri_breakdown: Json | null
          cri_score: number | null
          description: string | null
          difficulty: string | null
          duration_hours: number | null
          has_projects: boolean | null
          id: string
          instructor_name: string | null
          instructor_rating: number | null
          platform: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skill_tags: string[] | null
          status: string
          submitted_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          cri_breakdown?: Json | null
          cri_score?: number | null
          description?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          has_projects?: boolean | null
          id?: string
          instructor_name?: string | null
          instructor_rating?: number | null
          platform: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill_tags?: string[] | null
          status?: string
          submitted_at?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          cri_breakdown?: Json | null
          cri_score?: number | null
          description?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          has_projects?: boolean | null
          id?: string
          instructor_name?: string | null
          instructor_rating?: number | null
          platform?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill_tags?: string[] | null
          status?: string
          submitted_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      economic_indicators: {
        Row: {
          created_at: string
          data_source: string
          id: string
          indicator_name: string
          indicator_value: number
          location: string
          recorded_at: string
          time_period: string
        }
        Insert: {
          created_at?: string
          data_source?: string
          id?: string
          indicator_name: string
          indicator_value: number
          location: string
          recorded_at?: string
          time_period: string
        }
        Update: {
          created_at?: string
          data_source?: string
          id?: string
          indicator_name?: string
          indicator_value?: number
          location?: string
          recorded_at?: string
          time_period?: string
        }
        Relationships: []
      }
      educator_profiles: {
        Row: {
          average_cri_score: number | null
          bio: string | null
          created_at: string
          display_name: string
          expertise_areas: string[] | null
          id: string
          total_courses: number | null
          updated_at: string
          user_id: string
          verified_educator: boolean | null
        }
        Insert: {
          average_cri_score?: number | null
          bio?: string | null
          created_at?: string
          display_name: string
          expertise_areas?: string[] | null
          id?: string
          total_courses?: number | null
          updated_at?: string
          user_id: string
          verified_educator?: boolean | null
        }
        Update: {
          average_cri_score?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string
          expertise_areas?: string[] | null
          id?: string
          total_courses?: number | null
          updated_at?: string
          user_id?: string
          verified_educator?: boolean | null
        }
        Relationships: []
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
      learning_milestones: {
        Row: {
          achieved_at: string
          created_at: string
          id: string
          milestone_data: Json
          milestone_type: string
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          id?: string
          milestone_data?: Json
          milestone_type: string
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          achieved_at?: string
          created_at?: string
          id?: string
          milestone_data?: Json
          milestone_type?: string
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: []
      }
      location_career_metrics: {
        Row: {
          career_node_id: string | null
          confidence_level: number | null
          created_at: string | null
          data_source: string | null
          id: string
          last_updated: string | null
          location_id: string | null
          metric_type: string
          metric_value: number
          seasonal_adjustment: number | null
          trend_direction: string | null
        }
        Insert: {
          career_node_id?: string | null
          confidence_level?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          last_updated?: string | null
          location_id?: string | null
          metric_type: string
          metric_value: number
          seasonal_adjustment?: number | null
          trend_direction?: string | null
        }
        Update: {
          career_node_id?: string | null
          confidence_level?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          last_updated?: string | null
          location_id?: string | null
          metric_type?: string
          metric_value?: number
          seasonal_adjustment?: number | null
          trend_direction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_career_metrics_career_node_id_fkey"
            columns: ["career_node_id"]
            isOneToOne: false
            referencedRelation: "career_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_career_metrics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
        Relationships: [
          {
            foreignKeyName: "market_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      market_correlations: {
        Row: {
          calculated_at: string
          career_path_a: string
          career_path_b: string
          correlation_coefficient: number
          correlation_type: string
          created_at: string
          id: string
          location: string
          strength: string
          time_period: string
        }
        Insert: {
          calculated_at?: string
          career_path_a: string
          career_path_b: string
          correlation_coefficient?: number
          correlation_type: string
          created_at?: string
          id?: string
          location: string
          strength: string
          time_period?: string
        }
        Update: {
          calculated_at?: string
          career_path_a?: string
          career_path_b?: string
          correlation_coefficient?: number
          correlation_type?: string
          created_at?: string
          id?: string
          location?: string
          strength?: string
          time_period?: string
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
      maya_decisions: {
        Row: {
          confidence_score: number
          created_at: string
          decision_context: Json
          decision_rationale: string
          decision_type: string
          execution_result: Json | null
          id: string
          step_id: string | null
          user_feedback: string | null
          user_feedback_rating: number | null
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          confidence_score: number
          created_at?: string
          decision_context: Json
          decision_rationale: string
          decision_type: string
          execution_result?: Json | null
          id?: string
          step_id?: string | null
          user_feedback?: string | null
          user_feedback_rating?: number | null
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          confidence_score?: number
          created_at?: string
          decision_context?: Json
          decision_rationale?: string
          decision_type?: string
          execution_result?: Json | null
          id?: string
          step_id?: string | null
          user_feedback?: string | null
          user_feedback_rating?: number | null
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maya_decisions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maya_decisions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "autonomous_workflows"
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
      notification_preferences: {
        Row: {
          created_at: string
          delivery_delay_minutes: number | null
          email_enabled: boolean
          grouping_enabled: boolean
          id: string
          max_daily_alerts: number | null
          priority_threshold: string | null
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_delay_minutes?: number | null
          email_enabled?: boolean
          grouping_enabled?: boolean
          id?: string
          max_daily_alerts?: number | null
          priority_threshold?: string | null
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_delay_minutes?: number | null
          email_enabled?: boolean
          grouping_enabled?: boolean
          id?: string
          max_daily_alerts?: number | null
          priority_threshold?: string | null
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pattern_recognition_results: {
        Row: {
          anomaly_score: number | null
          career_path: string
          confidence_score: number
          created_at: string
          detected_at: string
          id: string
          location: string
          pattern_data: Json
          pattern_type: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          anomaly_score?: number | null
          career_path: string
          confidence_score?: number
          created_at?: string
          detected_at?: string
          id?: string
          location: string
          pattern_data?: Json
          pattern_type: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          anomaly_score?: number | null
          career_path?: string
          confidence_score?: number
          created_at?: string
          detected_at?: string
          id?: string
          location?: string
          pattern_data?: Json
          pattern_type?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      personalized_recommendations: {
        Row: {
          action_items: Json | null
          active: boolean
          career_path: string
          created_at: string
          description: string | null
          effort_required: string | null
          id: string
          impact_score: number | null
          location: string
          priority: string
          recommendation_type: string
          related_data: Json | null
          success_indicators: Json | null
          timeline: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_items?: Json | null
          active?: boolean
          career_path: string
          created_at?: string
          description?: string | null
          effort_required?: string | null
          id?: string
          impact_score?: number | null
          location: string
          priority?: string
          recommendation_type: string
          related_data?: Json | null
          success_indicators?: Json | null
          timeline?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_items?: Json | null
          active?: boolean
          career_path?: string
          created_at?: string
          description?: string | null
          effort_required?: string | null
          id?: string
          impact_score?: number | null
          location?: string
          priority?: string
          recommendation_type?: string
          related_data?: Json | null
          success_indicators?: Json | null
          timeline?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personalized_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      predictive_analysis_results: {
        Row: {
          accuracy_score: number | null
          analysis_type: string
          career_path: string
          confidence_score: number
          created_at: string
          data_sources: Json | null
          expires_at: string
          id: string
          location: string
          prediction_data: Json
          prediction_timeframe: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accuracy_score?: number | null
          analysis_type?: string
          career_path: string
          confidence_score?: number
          created_at?: string
          data_sources?: Json | null
          expires_at?: string
          id?: string
          location: string
          prediction_data?: Json
          prediction_timeframe?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accuracy_score?: number | null
          analysis_type?: string
          career_path?: string
          confidence_score?: number
          created_at?: string
          data_sources?: Json | null
          expires_at?: string
          id?: string
          location?: string
          prediction_data?: Json
          prediction_timeframe?: string
          updated_at?: string
          user_id?: string | null
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
      role_audit_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
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
      semantic_validations: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          edge_id: string | null
          expires_at: string | null
          id: string
          node_id: string | null
          validated_at: string | null
          validated_by: string | null
          validation_notes: string | null
          validation_status: string
          validation_type: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          edge_id?: string | null
          expires_at?: string | null
          id?: string
          node_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
          validation_status: string
          validation_type: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          edge_id?: string | null
          expires_at?: string | null
          id?: string
          node_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
          validation_status?: string
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_validations_edge_id_fkey"
            columns: ["edge_id"]
            isOneToOne: false
            referencedRelation: "career_graph_edges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_validations_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "career_graph_nodes"
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
      substitution_groups: {
        Row: {
          alternative_nodes: string[]
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          group_type: string
          id: string
          minimum_alternatives: number | null
          recommended_combination: string | null
          skill_target_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          alternative_nodes?: string[]
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          group_type: string
          id?: string
          minimum_alternatives?: number | null
          recommended_combination?: string | null
          skill_target_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          alternative_nodes?: string[]
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          group_type?: string
          id?: string
          minimum_alternatives?: number | null
          recommended_combination?: string | null
          skill_target_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "substitution_groups_skill_target_id_fkey"
            columns: ["skill_target_id"]
            isOneToOne: false
            referencedRelation: "career_graph_nodes"
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
      user_cri_goals: {
        Row: {
          created_at: string
          id: string
          target_cri: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_cri?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_cri?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_goals: {
        Row: {
          created_at: string | null
          goal_title: string | null
          goal_type: string | null
          id: string
          is_active: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          goal_title?: string | null
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          goal_title?: string | null
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_insight_interactions: {
        Row: {
          action_taken: string | null
          career_path: string | null
          confidence_score: number | null
          created_at: string
          feedback_notes: string | null
          feedback_rating: number | null
          id: string
          insight_id: string
          insight_type: string
          location: string | null
          updated_at: string
          user_id: string
          was_helpful: boolean | null
        }
        Insert: {
          action_taken?: string | null
          career_path?: string | null
          confidence_score?: number | null
          created_at?: string
          feedback_notes?: string | null
          feedback_rating?: number | null
          id?: string
          insight_id: string
          insight_type: string
          location?: string | null
          updated_at?: string
          user_id: string
          was_helpful?: boolean | null
        }
        Update: {
          action_taken?: string | null
          career_path?: string | null
          confidence_score?: number | null
          created_at?: string
          feedback_notes?: string | null
          feedback_rating?: number | null
          id?: string
          insight_id?: string
          insight_type?: string
          location?: string | null
          updated_at?: string
          user_id?: string
          was_helpful?: boolean | null
        }
        Relationships: []
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
      user_preferences: {
        Row: {
          experience_level: string | null
          has_completed_onboarding: boolean | null
          last_active_date: string | null
          preferred_features: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          experience_level?: string | null
          has_completed_onboarding?: boolean | null
          last_active_date?: string | null
          preferred_features?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          experience_level?: string | null
          has_completed_onboarding?: boolean | null
          last_active_date?: string | null
          preferred_features?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      workflow_certificates: {
        Row: {
          autonomous_steps: number
          certificate_data: Json
          certificate_number: string
          certificate_type: string
          completion_date: string
          created_at: string
          expires_at: string | null
          id: string
          is_revoked: boolean
          issued_at: string
          manual_steps: number
          maya_confidence_score: number
          revocation_reason: string | null
          revoked_at: string | null
          total_decisions: number
          updated_at: string
          user_feedback_score: number | null
          user_id: string
          verification_code: string
          workflow_description: string | null
          workflow_id: string
          workflow_title: string
        }
        Insert: {
          autonomous_steps?: number
          certificate_data?: Json
          certificate_number: string
          certificate_type?: string
          completion_date: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          issued_at?: string
          manual_steps?: number
          maya_confidence_score?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          total_decisions?: number
          updated_at?: string
          user_feedback_score?: number | null
          user_id: string
          verification_code: string
          workflow_description?: string | null
          workflow_id: string
          workflow_title: string
        }
        Update: {
          autonomous_steps?: number
          certificate_data?: Json
          certificate_number?: string
          certificate_type?: string
          completion_date?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          issued_at?: string
          manual_steps?: number
          maya_confidence_score?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          total_decisions?: number
          updated_at?: string
          user_feedback_score?: number | null
          user_id?: string
          verification_code?: string
          workflow_description?: string | null
          workflow_id?: string
          workflow_title?: string
        }
        Relationships: []
      }
      workflow_steps: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          dependencies: string[] | null
          description: string | null
          error_message: string | null
          estimated_duration_hours: number | null
          executed_at: string | null
          execution_result: Json | null
          id: string
          is_autonomous: boolean
          max_retries: number | null
          requires_user_input: boolean
          retry_count: number | null
          status: string
          step_order: number
          step_type: string
          title: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          dependencies?: string[] | null
          description?: string | null
          error_message?: string | null
          estimated_duration_hours?: number | null
          executed_at?: string | null
          execution_result?: Json | null
          id?: string
          is_autonomous?: boolean
          max_retries?: number | null
          requires_user_input?: boolean
          retry_count?: number | null
          status?: string
          step_order: number
          step_type: string
          title: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          dependencies?: string[] | null
          description?: string | null
          error_message?: string | null
          estimated_duration_hours?: number | null
          executed_at?: string | null
          execution_result?: Json | null
          id?: string
          is_autonomous?: boolean
          max_retries?: number | null
          requires_user_input?: boolean
          retry_count?: number | null
          status?: string
          step_order?: number
          step_type?: string
          title?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "autonomous_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          estimated_duration_days: number | null
          id: string
          is_active: boolean | null
          required_context: Json
          success_rate: number | null
          target_personas: Json
          template_name: string
          template_steps: Json
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          estimated_duration_days?: number | null
          id?: string
          is_active?: boolean | null
          required_context?: Json
          success_rate?: number | null
          target_personas?: Json
          template_name: string
          template_steps: Json
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          estimated_duration_days?: number | null
          id?: string
          is_active?: boolean | null
          required_context?: Json
          success_rate?: number | null
          target_personas?: Json
          template_name?: string
          template_steps?: Json
          title?: string
          updated_at?: string
          usage_count?: number | null
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
      calculate_alert_accuracy: {
        Args: { config_id: string; days_back?: number }
        Returns: number
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
      complete_course_progress: {
        Args: {
          user_id_param: string
          course_id_param: string
          completion_notes_param?: string
        }
        Returns: string
      }
      generate_certificate_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_user_roadmap: {
        Args: { user_id_param: string }
        Returns: Json
      }
      generate_verification_code: {
        Args: Record<PropertyKey, never>
        Returns: string
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
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          user_uuid: string
          check_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      refresh_career_steps_with_levels: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      start_course_progress: {
        Args: { user_id_param: string; course_id_param: string }
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
      app_role: "user" | "admin" | "mentor"
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
    Enums: {
      app_role: ["user", "admin", "mentor"],
    },
  },
} as const
