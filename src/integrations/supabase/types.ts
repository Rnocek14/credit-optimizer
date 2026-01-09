export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      abuse_prevention_logs: {
        Row: {
          action_type: string
          automated_action: boolean | null
          created_at: string | null
          id: string
          metadata: Json | null
          moderator_id: string | null
          reason: string | null
          resolution_status: string | null
          severity_level: string | null
          target_id: string
          target_type: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          automated_action?: boolean | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string | null
          reason?: string | null
          resolution_status?: string | null
          severity_level?: string | null
          target_id: string
          target_type: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          automated_action?: boolean | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string | null
          reason?: string | null
          resolution_status?: string | null
          severity_level?: string | null
          target_id?: string
          target_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      age_penalty_curves: {
        Row: {
          age_max: number
          age_min: number
          created_at: string
          id: string
          notes: string | null
          penalty_factor: number
          updated_at: string
        }
        Insert: {
          age_max: number
          age_min: number
          created_at?: string
          id?: string
          notes?: string | null
          penalty_factor?: number
          updated_at?: string
        }
        Update: {
          age_max?: number
          age_min?: number
          created_at?: string
          id?: string
          notes?: string | null
          penalty_factor?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_analyzer_audits: {
        Row: {
          architecture_recs: Json | null
          audit_type: string
          created_at: string
          gaps: Json | null
          id: string
          quick_wins: Json | null
          repo_id: string
          scorecard: Json
          user_id: string
          ux_recs: Json | null
        }
        Insert: {
          architecture_recs?: Json | null
          audit_type?: string
          created_at?: string
          gaps?: Json | null
          id?: string
          quick_wins?: Json | null
          repo_id: string
          scorecard?: Json
          user_id: string
          ux_recs?: Json | null
        }
        Update: {
          architecture_recs?: Json | null
          audit_type?: string
          created_at?: string
          gaps?: Json | null
          id?: string
          quick_wins?: Json | null
          repo_id?: string
          scorecard?: Json
          user_id?: string
          ux_recs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyzer_audits_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "ai_analyzer_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analyzer_chunks: {
        Row: {
          chunk_content: string
          chunk_index: number
          content_hash: string
          created_at: string
          embedding: string | null
          embedding_data: Json | null
          file_path: string
          id: string
          language: string | null
          repo_id: string
          symbols: string[] | null
          total_chunks: number
          updated_at: string
        }
        Insert: {
          chunk_content: string
          chunk_index?: number
          content_hash: string
          created_at?: string
          embedding?: string | null
          embedding_data?: Json | null
          file_path: string
          id?: string
          language?: string | null
          repo_id: string
          symbols?: string[] | null
          total_chunks?: number
          updated_at?: string
        }
        Update: {
          chunk_content?: string
          chunk_index?: number
          content_hash?: string
          created_at?: string
          embedding?: string | null
          embedding_data?: Json | null
          file_path?: string
          id?: string
          language?: string | null
          repo_id?: string
          symbols?: string[] | null
          total_chunks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyzer_chunks_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "ai_analyzer_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analyzer_jobs: {
        Row: {
          completed_at: string | null
          cost_estimate: number | null
          created_at: string
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          repo_id: string
          results: Json | null
          started_at: string | null
          status: string
          token_usage: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type: string
          repo_id: string
          results?: Json | null
          started_at?: string | null
          status?: string
          token_usage?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          repo_id?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          token_usage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyzer_jobs_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "ai_analyzer_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analyzer_repos: {
        Row: {
          created_at: string
          file_count: number | null
          id: string
          ignore_patterns: string[] | null
          indexed_at: string | null
          language_breakdown: Json | null
          name: string
          repo_type: string
          source_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_count?: number | null
          id?: string
          ignore_patterns?: string[] | null
          indexed_at?: string | null
          language_breakdown?: Json | null
          name: string
          repo_type?: string
          source_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_count?: number | null
          id?: string
          ignore_patterns?: string[] | null
          indexed_at?: string | null
          language_breakdown?: Json | null
          name?: string
          repo_type?: string
          source_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_model_usage: {
        Row: {
          complexity: string | null
          created_at: string
          error_message: string | null
          function_name: string | null
          id: string
          latency_ms: number | null
          model: string | null
          request_id: string | null
          route: string | null
          success: boolean
          task: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          complexity?: string | null
          created_at?: string
          error_message?: string | null
          function_name?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          request_id?: string | null
          route?: string | null
          success?: boolean
          task: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          complexity?: string | null
          created_at?: string
          error_message?: string | null
          function_name?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          request_id?: string | null
          route?: string | null
          success?: boolean
          task?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_model_usage_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          function_name: string
          id: string
          latency_ms: number | null
          model: string | null
          success: boolean | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          success?: boolean | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          success?: boolean | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
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
          track_id: string | null
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
          track_id?: string | null
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
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_resume_drafts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_resume_drafts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
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
      alt_credit_options: {
        Row: {
          acceptance_rate: number | null
          cost_estimate: number | null
          course_id: string | null
          created_at: string | null
          estimated_hours: number | null
          id: string
          proctoring_required: boolean | null
          provider: string
          provider_course_id: string | null
          provider_course_name: string
        }
        Insert: {
          acceptance_rate?: number | null
          cost_estimate?: number | null
          course_id?: string | null
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          proctoring_required?: boolean | null
          provider: string
          provider_course_id?: string | null
          provider_course_name: string
        }
        Update: {
          acceptance_rate?: number | null
          cost_estimate?: number | null
          course_id?: string | null
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          proctoring_required?: boolean | null
          provider?: string
          provider_course_id?: string | null
          provider_course_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "alt_credit_options_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      alt_credits: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          credits_typical: number
          description: string | null
          duration_estimate_weeks: number | null
          exam_based: boolean | null
          id: string
          identifier: string
          level: number | null
          metadata: Json | null
          provider_url: string | null
          source_code: string
          subject_area: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          credits_typical: number
          description?: string | null
          duration_estimate_weeks?: number | null
          exam_based?: boolean | null
          id?: string
          identifier: string
          level?: number | null
          metadata?: Json | null
          provider_url?: string | null
          source_code: string
          subject_area?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          credits_typical?: number
          description?: string | null
          duration_estimate_weeks?: number | null
          exam_based?: boolean | null
          id?: string
          identifier?: string
          level?: number | null
          metadata?: Json | null
          provider_url?: string | null
          source_code?: string
          subject_area?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      alternative_courses: {
        Row: {
          created_at: string | null
          creator_name: string | null
          cri_score: number | null
          description: string | null
          difficulty: number | null
          estimated_hours: number | null
          external_id: string
          id: string
          provider: string
          published_at: string | null
          skills: Json | null
          title: string
          topics: unknown
          url: string
        }
        Insert: {
          created_at?: string | null
          creator_name?: string | null
          cri_score?: number | null
          description?: string | null
          difficulty?: number | null
          estimated_hours?: number | null
          external_id: string
          id?: string
          provider: string
          published_at?: string | null
          skills?: Json | null
          title: string
          topics?: unknown
          url: string
        }
        Update: {
          created_at?: string | null
          creator_name?: string | null
          cri_score?: number | null
          description?: string | null
          difficulty?: number | null
          estimated_hours?: number | null
          external_id?: string
          id?: string
          provider?: string
          published_at?: string | null
          skills?: Json | null
          title?: string
          topics?: unknown
          url?: string
        }
        Relationships: []
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
      app_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          student_id: string
          submission_files: Json | null
          submission_text: string | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          student_id: string
          submission_files?: Json | null
          submission_text?: string | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          student_id?: string
          submission_files?: Json | null
          submission_text?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "course_assignments"
            referencedColumns: ["id"]
          },
        ]
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
          track_id: string | null
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
          track_id?: string | null
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
          track_id?: string | null
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
      block_gates: {
        Row: {
          block_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          block_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          block_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_gates_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: true
            referencedRelation: "requirement_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      block_members: {
        Row: {
          block_id: string
          course_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          block_id: string
          course_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          block_id?: string
          course_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_members_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "requirement_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      block_outcomes: {
        Row: {
          block_id: string
          created_at: string | null
          skill_id: string
          weight: number | null
        }
        Insert: {
          block_id: string
          created_at?: string | null
          skill_id: string
          weight?: number | null
        }
        Update: {
          block_id?: string
          created_at?: string | null
          skill_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "block_outcomes_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "requirement_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_outcomes_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      block_requirement_map: {
        Row: {
          block_id: string
          program_id: string
          requirement_id: string
        }
        Insert: {
          block_id: string
          program_id: string
          requirement_id: string
        }
        Update: {
          block_id?: string
          program_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_requirement_map_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "program_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_requirement_map: {
        Row: {
          canon_req_code: string
          confidence: number | null
          created_at: string | null
          id: string
          marketplace_course_id: string
          source: string | null
        }
        Insert: {
          canon_req_code: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          marketplace_course_id: string
          source?: string | null
        }
        Update: {
          canon_req_code?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          marketplace_course_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canonical_requirement_map_canon_req_code_fkey"
            columns: ["canon_req_code"]
            isOneToOne: false
            referencedRelation: "requirement_catalog"
            referencedColumns: ["canon_req_code"]
          },
          {
            foreignKeyName: "canonical_requirement_map_marketplace_course_id_fkey"
            columns: ["marketplace_course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      career_goals: {
        Row: {
          active: boolean | null
          auto_created: boolean | null
          created_at: string
          current_progress: number | null
          description: string | null
          estimated_timeline_weeks: number | null
          id: string
          market_demand_score: number | null
          micro_goal: boolean | null
          priority_score: number | null
          skill_gaps: string[] | null
          source_hub: string | null
          source_item_id: string | null
          suggested_due_date: string | null
          target_date: string | null
          target_role: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          auto_created?: boolean | null
          created_at?: string
          current_progress?: number | null
          description?: string | null
          estimated_timeline_weeks?: number | null
          id?: string
          market_demand_score?: number | null
          micro_goal?: boolean | null
          priority_score?: number | null
          skill_gaps?: string[] | null
          source_hub?: string | null
          source_item_id?: string | null
          suggested_due_date?: string | null
          target_date?: string | null
          target_role?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          auto_created?: boolean | null
          created_at?: string
          current_progress?: number | null
          description?: string | null
          estimated_timeline_weeks?: number | null
          id?: string
          market_demand_score?: number | null
          micro_goal?: boolean | null
          priority_score?: number | null
          skill_gaps?: string[] | null
          source_hub?: string | null
          source_item_id?: string | null
          suggested_due_date?: string | null
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
          age_sensitivity_score: number | null
          ai_confidence_score: number | null
          ai_generated_description: string | null
          automation_risk_pct: number | null
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
          age_sensitivity_score?: number | null
          ai_confidence_score?: number | null
          ai_generated_description?: string | null
          automation_risk_pct?: number | null
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
          age_sensitivity_score?: number | null
          ai_confidence_score?: number | null
          ai_generated_description?: string | null
          automation_risk_pct?: number | null
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
      career_risks: {
        Row: {
          age_penalty_factor: number
          ai_job_risk_pct: number
          calculated_at: string
          created_at: string
          cri_mismatch: number
          id: string
          risk_breakdown: Json
          roi_volatility: number
          switch_risk_score: number
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age_penalty_factor?: number
          ai_job_risk_pct?: number
          calculated_at?: string
          created_at?: string
          cri_mismatch?: number
          id?: string
          risk_breakdown?: Json
          roi_volatility?: number
          switch_risk_score?: number
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age_penalty_factor?: number
          ai_job_risk_pct?: number
          calculated_at?: string
          created_at?: string
          cri_mismatch?: number
          id?: string
          risk_breakdown?: Json
          roi_volatility?: number
          switch_risk_score?: number
          track_id?: string
          updated_at?: string
          user_id?: string
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
      career_switch_scenarios: {
        Row: {
          additional_learning_hours: number
          break_even_months: number
          created_at: string
          direct_cost: number
          friction_cost: number
          from_track: string
          id: string
          notes: string | null
          opportunity_cost: number
          roi_3yr_pct: number
          skill_overlap_pct: number
          time_saved_hours: number
          to_track: string
          updated_at: string
        }
        Insert: {
          additional_learning_hours?: number
          break_even_months?: number
          created_at?: string
          direct_cost?: number
          friction_cost?: number
          from_track: string
          id?: string
          notes?: string | null
          opportunity_cost?: number
          roi_3yr_pct?: number
          skill_overlap_pct?: number
          time_saved_hours?: number
          to_track: string
          updated_at?: string
        }
        Update: {
          additional_learning_hours?: number
          break_even_months?: number
          created_at?: string
          direct_cost?: number
          friction_cost?: number
          from_track?: string
          id?: string
          notes?: string | null
          opportunity_cost?: number
          roi_3yr_pct?: number
          skill_overlap_pct?: number
          time_saved_hours?: number
          to_track?: string
          updated_at?: string
        }
        Relationships: []
      }
      career_switches: {
        Row: {
          assumptions: Json
          break_even_months: number
          created_at: string
          cri_delta: number
          direct_cost: number
          friction_cost: number
          from_track_id: string | null
          id: string
          location_id: string | null
          lost_time_hours: number
          opportunity_cost: number
          roi_3yr: number
          salary_uplift_3yr: number
          skill_overlap: number
          status: string
          switch_cost: number
          time_gained_hours: number
          to_track_id: string | null
          transfer_credit_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assumptions?: Json
          break_even_months?: number
          created_at?: string
          cri_delta?: number
          direct_cost?: number
          friction_cost?: number
          from_track_id?: string | null
          id?: string
          location_id?: string | null
          lost_time_hours?: number
          opportunity_cost?: number
          roi_3yr?: number
          salary_uplift_3yr?: number
          skill_overlap?: number
          status?: string
          switch_cost?: number
          time_gained_hours?: number
          to_track_id?: string | null
          transfer_credit_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assumptions?: Json
          break_even_months?: number
          created_at?: string
          cri_delta?: number
          direct_cost?: number
          friction_cost?: number
          from_track_id?: string | null
          id?: string
          location_id?: string | null
          lost_time_hours?: number
          opportunity_cost?: number
          roi_3yr?: number
          salary_uplift_3yr?: number
          skill_overlap?: number
          status?: string
          switch_cost?: number
          time_gained_hours?: number
          to_track_id?: string | null
          transfer_credit_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_tracks: {
        Row: {
          age_penalty_factor: number | null
          ai_job_risk_pct: number | null
          archived: boolean
          color: string | null
          created_at: string
          description: string | null
          goal: string | null
          growth_potential: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          lqi_score: number | null
          order_index: number
          reasoning: string | null
          risk_score: number | null
          roi_score: number | null
          slug: string
          switch_readiness_score: number | null
          time_to_proficiency: string | null
          title: string
          track_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age_penalty_factor?: number | null
          ai_job_risk_pct?: number | null
          archived?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          goal?: string | null
          growth_potential?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          lqi_score?: number | null
          order_index?: number
          reasoning?: string | null
          risk_score?: number | null
          roi_score?: number | null
          slug: string
          switch_readiness_score?: number | null
          time_to_proficiency?: string | null
          title: string
          track_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age_penalty_factor?: number | null
          ai_job_risk_pct?: number | null
          archived?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          goal?: string | null
          growth_potential?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          lqi_score?: number | null
          order_index?: number
          reasoning?: string | null
          risk_score?: number | null
          roi_score?: number | null
          slug?: string
          switch_readiness_score?: number | null
          time_to_proficiency?: string | null
          title?: string
          track_name?: string | null
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
      career_tracks_backup_20250821: {
        Row: {
          age_penalty_factor: number | null
          ai_job_risk_pct: number | null
          archived: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          goal: string | null
          growth_potential: string | null
          icon: string | null
          id: string | null
          lqi_score: number | null
          order_index: number | null
          reasoning: string | null
          risk_score: number | null
          roi_score: number | null
          switch_readiness_score: number | null
          time_to_proficiency: string | null
          title: string | null
          track_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age_penalty_factor?: number | null
          ai_job_risk_pct?: number | null
          archived?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          goal?: string | null
          growth_potential?: string | null
          icon?: string | null
          id?: string | null
          lqi_score?: number | null
          order_index?: number | null
          reasoning?: string | null
          risk_score?: number | null
          roi_score?: number | null
          switch_readiness_score?: number | null
          time_to_proficiency?: string | null
          title?: string | null
          track_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age_penalty_factor?: number | null
          ai_job_risk_pct?: number | null
          archived?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          goal?: string | null
          growth_potential?: string | null
          icon?: string | null
          id?: string | null
          lqi_score?: number | null
          order_index?: number | null
          reasoning?: string | null
          risk_score?: number | null
          roi_score?: number | null
          switch_readiness_score?: number | null
          time_to_proficiency?: string | null
          title?: string | null
          track_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      celebration_moments: {
        Row: {
          celebration_data: Json
          celebration_type: string
          created_at: string
          dismissed_at: string | null
          displayed_at: string | null
          id: string
          trigger_data: Json
          user_id: string
        }
        Insert: {
          celebration_data?: Json
          celebration_type: string
          created_at?: string
          dismissed_at?: string | null
          displayed_at?: string | null
          id?: string
          trigger_data?: Json
          user_id: string
        }
        Update: {
          celebration_data?: Json
          celebration_type?: string
          created_at?: string
          dismissed_at?: string | null
          displayed_at?: string | null
          id?: string
          trigger_data?: Json
          user_id?: string
        }
        Relationships: []
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
      challenge_participants: {
        Row: {
          challenge_id: string
          completed_at: string | null
          completion_status: string
          final_score: number | null
          id: string
          progress_data: Json | null
          registered_at: string
          registration_data: Json | null
          team_name: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          completion_status?: string
          final_score?: number | null
          id?: string
          progress_data?: Json | null
          registered_at?: string
          registration_data?: Json | null
          team_name?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          completion_status?: string
          final_score?: number | null
          id?: string
          progress_data?: Json | null
          registered_at?: string
          registration_data?: Json | null
          team_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "learning_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_course_cri_scores: {
        Row: {
          course_id: string | null
          created_at: string | null
          difficulty_score: number | null
          id: string
          outcome_score: number | null
          rigor_score: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          difficulty_score?: number | null
          id?: string
          outcome_score?: number | null
          rigor_score?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          difficulty_score?: number | null
          id?: string
          outcome_score?: number | null
          rigor_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_course_cri_scores_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "ci_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_courses: {
        Row: {
          active: boolean | null
          created_at: string | null
          difficulty: number | null
          duration_hours: number | null
          id: string
          instructor_id: string | null
          platform_id: string | null
          slug: string
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          difficulty?: number | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          platform_id?: string | null
          slug: string
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          difficulty?: number | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          platform_id?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "ci_instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_courses_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "ci_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_instructors: {
        Row: {
          created_at: string | null
          id: string
          name: string
          org: string | null
          reputation: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          org?: string | null
          reputation?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          org?: string | null
          reputation?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ci_platforms: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      ci_track_cri_cache: {
        Row: {
          calculated_at: string
          components: Json
          created_at: string | null
          cri_breakdown: Json
          cri_score: number
          expires_at: string
          id: string
          model_version: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          calculated_at?: string
          components?: Json
          created_at?: string | null
          cri_breakdown?: Json
          cri_score: number
          expires_at?: string
          id?: string
          model_version?: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          calculated_at?: string
          components?: Json
          created_at?: string | null
          cri_breakdown?: Json
          cri_score?: number
          expires_at?: string
          id?: string
          model_version?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      circuit_breaker_state: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          last_failure_time: string | null
          next_retry_time: string | null
          service_name: string
          state: string
          success_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          last_failure_time?: string | null
          next_retry_time?: string | null
          service_name: string
          state?: string
          success_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          last_failure_time?: string | null
          next_retry_time?: string | null
          service_name?: string
          state?: string
          success_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      col_index: {
        Row: {
          city: string
          col_index: number
          country: string
          created_at: string
          groceries_index: number
          housing_index: number
          id: string
          region: string
          transport_index: number
          updated_at: string
          visa_required: boolean
        }
        Insert: {
          city: string
          col_index?: number
          country: string
          created_at?: string
          groceries_index?: number
          housing_index?: number
          id?: string
          region: string
          transport_index?: number
          updated_at?: string
          visa_required?: boolean
        }
        Update: {
          city?: string
          col_index?: number
          country?: string
          created_at?: string
          groceries_index?: number
          housing_index?: number
          id?: string
          region?: string
          transport_index?: number
          updated_at?: string
          visa_required?: boolean
        }
        Relationships: []
      }
      completion_triggers: {
        Row: {
          created_at: string | null
          id: string
          processed_at: string | null
          source_data: Json
          status: string | null
          target_action: string
          trigger_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          processed_at?: string | null
          source_data: Json
          status?: string | null
          target_action: string
          trigger_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          processed_at?: string | null
          source_data?: Json
          status?: string | null
          target_action?: string
          trigger_type?: string
          user_id?: string
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
      course_assignments: {
        Row: {
          assignment_type: string | null
          course_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          max_points: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assignment_type?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_points?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assignment_type?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_points?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "teaching_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_completion_feedback: {
        Row: {
          career_impact_level: string | null
          completion_date: string
          course_id: string
          created_at: string | null
          difficulty_rating: number | null
          feedback_text: string | null
          id: string
          practical_application_score: number | null
          satisfaction_rating: number | null
          skills_gained: string[] | null
          time_investment_hours: number | null
          user_id: string
          verification_documents: Json | null
        }
        Insert: {
          career_impact_level?: string | null
          completion_date: string
          course_id: string
          created_at?: string | null
          difficulty_rating?: number | null
          feedback_text?: string | null
          id?: string
          practical_application_score?: number | null
          satisfaction_rating?: number | null
          skills_gained?: string[] | null
          time_investment_hours?: number | null
          user_id: string
          verification_documents?: Json | null
        }
        Update: {
          career_impact_level?: string | null
          completion_date?: string
          course_id?: string
          created_at?: string | null
          difficulty_rating?: number | null
          feedback_text?: string | null
          id?: string
          practical_application_score?: number | null
          satisfaction_rating?: number | null
          skills_gained?: string[] | null
          time_investment_hours?: number | null
          user_id?: string
          verification_documents?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "course_completion_feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_cri_scores: {
        Row: {
          calculation_data: Json | null
          calculation_version: string | null
          course_id: string
          created_at: string | null
          difficulty_score: number | null
          historical_scores: Json | null
          id: string
          instructor_prestige_score: number | null
          market_relevance_score: number | null
          outcome_conversion_score: number | null
          overall_cri_score: number | null
          platform_credibility_score: number | null
          project_rigor_score: number | null
          skill_coverage_score: number | null
          updated_at: string | null
        }
        Insert: {
          calculation_data?: Json | null
          calculation_version?: string | null
          course_id: string
          created_at?: string | null
          difficulty_score?: number | null
          historical_scores?: Json | null
          id?: string
          instructor_prestige_score?: number | null
          market_relevance_score?: number | null
          outcome_conversion_score?: number | null
          overall_cri_score?: number | null
          platform_credibility_score?: number | null
          project_rigor_score?: number | null
          skill_coverage_score?: number | null
          updated_at?: string | null
        }
        Update: {
          calculation_data?: Json | null
          calculation_version?: string | null
          course_id?: string
          created_at?: string | null
          difficulty_score?: number | null
          historical_scores?: Json | null
          id?: string
          instructor_prestige_score?: number | null
          market_relevance_score?: number | null
          outcome_conversion_score?: number | null
          overall_cri_score?: number | null
          platform_credibility_score?: number | null
          project_rigor_score?: number | null
          skill_coverage_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_cri_scores_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_difficulty_ratings: {
        Row: {
          ai_analysis_data: Json | null
          ai_difficulty_score: number | null
          confidence_score: number | null
          course_id: string
          created_at: string | null
          id: string
          normalized_difficulty: number | null
          total_user_ratings: number | null
          updated_at: string | null
          user_average_difficulty: number | null
        }
        Insert: {
          ai_analysis_data?: Json | null
          ai_difficulty_score?: number | null
          confidence_score?: number | null
          course_id: string
          created_at?: string | null
          id?: string
          normalized_difficulty?: number | null
          total_user_ratings?: number | null
          updated_at?: string | null
          user_average_difficulty?: number | null
        }
        Update: {
          ai_analysis_data?: Json | null
          ai_difficulty_score?: number | null
          confidence_score?: number | null
          course_id?: string
          created_at?: string | null
          id?: string
          normalized_difficulty?: number | null
          total_user_ratings?: number | null
          updated_at?: string | null
          user_average_difficulty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_difficulty_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_discovery_queue: {
        Row: {
          course_url: string
          created_at: string
          discovery_data: Json
          discovery_method: string
          error_message: string | null
          id: string
          priority_score: number | null
          processed_at: string | null
          processing_status: string
          source_platform: string
        }
        Insert: {
          course_url: string
          created_at?: string
          discovery_data?: Json
          discovery_method?: string
          error_message?: string | null
          id?: string
          priority_score?: number | null
          processed_at?: string | null
          processing_status?: string
          source_platform: string
        }
        Update: {
          course_url?: string
          created_at?: string
          discovery_data?: Json
          discovery_method?: string
          error_message?: string | null
          id?: string
          priority_score?: number | null
          processed_at?: string | null
          processing_status?: string
          source_platform?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          final_grade: number | null
          id: string
          progress_percentage: number | null
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          final_grade?: number | null
          id?: string
          progress_percentage?: number | null
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          final_grade?: number | null
          id?: string
          progress_percentage?: number | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "teaching_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_equivalencies: {
        Row: {
          course_id: string
          created_at: string | null
          equivalent_course_id: string
          evidence: Json | null
          id: string
          last_updated: string | null
          provider_from: string
          provider_to: string
          score: number | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          equivalent_course_id: string
          evidence?: Json | null
          id?: string
          last_updated?: string | null
          provider_from: string
          provider_to: string
          score?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          equivalent_course_id?: string
          evidence?: Json | null
          id?: string
          last_updated?: string | null
          provider_from?: string
          provider_to?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_equivalencies_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_equivalencies_equivalent_course_id_fkey"
            columns: ["equivalent_course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_intelligence_pipeline: {
        Row: {
          ai_analysis: Json
          confidence_score: number | null
          course_id: string
          created_at: string
          cri_predictions: Json
          id: string
          market_alignment_score: number | null
          mentor_validation_status: string | null
          pipeline_stage: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          ai_analysis?: Json
          confidence_score?: number | null
          course_id: string
          created_at?: string
          cri_predictions?: Json
          id?: string
          market_alignment_score?: number | null
          mentor_validation_status?: string | null
          pipeline_stage?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          ai_analysis?: Json
          confidence_score?: number | null
          course_id?: string
          created_at?: string
          cri_predictions?: Json
          id?: string
          market_alignment_score?: number | null
          mentor_validation_status?: string | null
          pipeline_stage?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_course_intelligence_pipeline_course_id"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_discovery_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      course_platforms: {
        Row: {
          api_enabled: boolean | null
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          api_enabled?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          api_enabled?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      course_prereqs: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          min_grade: string | null
          prereq_course_id: string | null
          prereq_skill_id: string | null
          required: boolean | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          min_grade?: string | null
          prereq_course_id?: string | null
          prereq_skill_id?: string | null
          required?: boolean | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          min_grade?: string | null
          prereq_course_id?: string | null
          prereq_skill_id?: string | null
          required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "course_prereqs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prereqs_prereq_course_id_fkey"
            columns: ["prereq_course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
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
          track_id: string | null
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
          track_id?: string | null
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
          track_id?: string | null
          updated_at?: string
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: []
      }
      course_progress_track_usage: {
        Row: {
          course_id: string
          created_at: string
          id: string
          note: string | null
          progress_id: string | null
          track_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          note?: string | null
          progress_id?: string | null
          track_id: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          note?: string | null
          progress_id?: string | null
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_track_usage_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_track_usage_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
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
      course_skill_mappings: {
        Row: {
          course_id: string
          created_at: string | null
          hours_focus: number | null
          id: string
          relevance_score: number | null
          skill_category: string | null
          skill_depth: string | null
          skill_name: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          hours_focus?: number | null
          id?: string
          relevance_score?: number | null
          skill_category?: string | null
          skill_depth?: string | null
          skill_name: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          hours_focus?: number | null
          id?: string
          relevance_score?: number | null
          skill_category?: string | null
          skill_depth?: string | null
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_skill_mappings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_skills: {
        Row: {
          course_id: string
          created_at: string | null
          skill_id: string
          weight: number | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          skill_id: string
          weight?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          skill_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_skills_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_skills_skill_id_fkey"
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
      courses: {
        Row: {
          category: string | null
          cost_usd: number | null
          course_url: string
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          estimated_hours: number | null
          id: string
          instructor_id: string | null
          instructor_name: string | null
          is_active: boolean | null
          language: string | null
          last_analyzed_at: string | null
          platform: string
          subcategory: string | null
          title: string
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          category?: string | null
          cost_usd?: number | null
          course_url: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          instructor_id?: string | null
          instructor_name?: string | null
          is_active?: boolean | null
          language?: string | null
          last_analyzed_at?: string | null
          platform: string
          subcategory?: string | null
          title: string
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          category?: string | null
          cost_usd?: number | null
          course_url?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          instructor_id?: string | null
          instructor_name?: string | null
          is_active?: boolean | null
          language?: string | null
          last_analyzed_at?: string | null
          platform?: string
          subcategory?: string | null
          title?: string
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transfer_rules: {
        Row: {
          acceptance_status: string | null
          confidence: number | null
          effective_end: string | null
          effective_from: string | null
          effective_start: string | null
          effective_to: string | null
          evidence_url: string | null
          id: string
          last_verified_at: string | null
          precedence: number | null
          rule_payload: Json | null
          rule_source: string | null
          rule_type: string | null
          source_course_code: string | null
          source_institution: string
          status: string | null
          superseded_by: string | null
          target_course_code: string | null
          target_institution: string
          verification_source: string | null
        }
        Insert: {
          acceptance_status?: string | null
          confidence?: number | null
          effective_end?: string | null
          effective_from?: string | null
          effective_start?: string | null
          effective_to?: string | null
          evidence_url?: string | null
          id?: string
          last_verified_at?: string | null
          precedence?: number | null
          rule_payload?: Json | null
          rule_source?: string | null
          rule_type?: string | null
          source_course_code?: string | null
          source_institution: string
          status?: string | null
          superseded_by?: string | null
          target_course_code?: string | null
          target_institution: string
          verification_source?: string | null
        }
        Update: {
          acceptance_status?: string | null
          confidence?: number | null
          effective_end?: string | null
          effective_from?: string | null
          effective_start?: string | null
          effective_to?: string | null
          evidence_url?: string | null
          id?: string
          last_verified_at?: string | null
          precedence?: number | null
          rule_payload?: Json | null
          rule_source?: string | null
          rule_type?: string | null
          source_course_code?: string | null
          source_institution?: string
          status?: string | null
          superseded_by?: string | null
          target_course_code?: string | null
          target_institution?: string
          verification_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transfer_rules_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "credit_transfer_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_institution_equivalencies: {
        Row: {
          alt_credit_id: string
          confidence: number | null
          created_at: string | null
          credits_awarded: number
          gened_category_code: string | null
          id: string
          institution_id: string
          institutional_course_code: string
          institutional_course_name: string | null
          last_verified_date: string | null
          level: number | null
          metadata: Json | null
          notes: string | null
          requirement_area: string | null
          source_documentation: string | null
          updated_at: string | null
        }
        Insert: {
          alt_credit_id: string
          confidence?: number | null
          created_at?: string | null
          credits_awarded: number
          gened_category_code?: string | null
          id?: string
          institution_id: string
          institutional_course_code: string
          institutional_course_name?: string | null
          last_verified_date?: string | null
          level?: number | null
          metadata?: Json | null
          notes?: string | null
          requirement_area?: string | null
          source_documentation?: string | null
          updated_at?: string | null
        }
        Update: {
          alt_credit_id?: string
          confidence?: number | null
          created_at?: string | null
          credits_awarded?: number
          gened_category_code?: string | null
          id?: string
          institution_id?: string
          institutional_course_code?: string
          institutional_course_name?: string | null
          last_verified_date?: string | null
          level?: number | null
          metadata?: Json | null
          notes?: string | null
          requirement_area?: string | null
          source_documentation?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_institution_equivalencies_alt_credit_id_fkey"
            columns: ["alt_credit_id"]
            isOneToOne: false
            referencedRelation: "alt_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_institution_equivalencies_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      data_imports: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          error_message: string | null
          id: string
          import_source: string
          import_status: string
          import_type: string
          metadata: Json | null
          processed_at: string | null
          processed_data: Json
          raw_data: Json
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          import_source: string
          import_status?: string
          import_type: string
          metadata?: Json | null
          processed_at?: string | null
          processed_data?: Json
          raw_data?: Json
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          import_source?: string
          import_status?: string
          import_type?: string
          metadata?: Json | null
          processed_at?: string | null
          processed_data?: Json
          raw_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
        ]
      }
      degree_templates: {
        Row: {
          catalog_year: string | null
          created_at: string | null
          estimated_cost: number | null
          estimated_duration_months: number | null
          id: string
          institution_code: string
          institution_id: string
          metadata: Json | null
          notes: string | null
          policy_last_verified: string | null
          program_code: string
          program_name: string
          template_data: Json
          total_credits: number
          track_type: string
          updated_at: string | null
        }
        Insert: {
          catalog_year?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          estimated_duration_months?: number | null
          id: string
          institution_code: string
          institution_id: string
          metadata?: Json | null
          notes?: string | null
          policy_last_verified?: string | null
          program_code: string
          program_name: string
          template_data: Json
          total_credits: number
          track_type: string
          updated_at?: string | null
        }
        Update: {
          catalog_year?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          estimated_duration_months?: number | null
          id?: string
          institution_code?: string
          institution_id?: string
          metadata?: Json | null
          notes?: string | null
          policy_last_verified?: string | null
          program_code?: string
          program_name?: string
          template_data?: Json
          total_credits?: number
          track_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "degree_templates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
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
      edge_invocations: {
        Row: {
          created_at: string
          id: string
          identifier: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      edu_courses: {
        Row: {
          area: string | null
          code: string
          created_at: string
          credits: number
          description: string | null
          id: string
          is_capstone: boolean
          is_core: boolean
          learning_outcomes: string[] | null
          level_year: number
          term: string | null
          title: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          code: string
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_capstone?: boolean
          is_core?: boolean
          learning_outcomes?: string[] | null
          level_year?: number
          term?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          code?: string
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_capstone?: boolean
          is_core?: boolean
          learning_outcomes?: string[] | null
          level_year?: number
          term?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      edu_equivalencies: {
        Row: {
          cost_estimate: number | null
          course_id: string | null
          created_at: string
          credits: number
          external_ref: string
          id: string
          notes: string | null
          provider: string
          requirement_id: string | null
          source: string
          time_estimate_hours: number | null
          updated_at: string
        }
        Insert: {
          cost_estimate?: number | null
          course_id?: string | null
          created_at?: string
          credits?: number
          external_ref: string
          id?: string
          notes?: string | null
          provider: string
          requirement_id?: string | null
          source: string
          time_estimate_hours?: number | null
          updated_at?: string
        }
        Update: {
          cost_estimate?: number | null
          course_id?: string | null
          created_at?: string
          credits?: number
          external_ref?: string
          id?: string
          notes?: string | null
          provider?: string
          requirement_id?: string | null
          source?: string
          time_estimate_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_equivalencies_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edu_equivalencies_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "edu_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_prereqs: {
        Row: {
          child_course_id: string
          created_at: string
          id: string
          parent_course_id: string
          prereq_type: string
        }
        Insert: {
          child_course_id: string
          created_at?: string
          id?: string
          parent_course_id: string
          prereq_type?: string
        }
        Update: {
          child_course_id?: string
          created_at?: string
          id?: string
          parent_course_id?: string
          prereq_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_prereqs_child_course_id_fkey"
            columns: ["child_course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edu_prereqs_parent_course_id_fkey"
            columns: ["parent_course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_requirement_options: {
        Row: {
          course_id: string
          created_at: string
          id: string
          requirement_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          requirement_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_requirement_options_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edu_requirement_options_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "edu_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_requirements: {
        Row: {
          created_at: string
          credits_required: number
          description: string | null
          id: string
          kind: string
          level_year: number | null
          program_area: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_required?: number
          description?: string | null
          id?: string
          kind: string
          level_year?: number | null
          program_area?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_required?: number
          description?: string | null
          id?: string
          kind?: string
          level_year?: number | null
          program_area?: string | null
          title?: string
          updated_at?: string
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
      enhanced_user_profiles: {
        Row: {
          available_hours_per_week: number | null
          career_goals: string[] | null
          created_at: string | null
          id: string
          learning_preferences: Json | null
          learning_style: Json | null
          motivational_factors: string[] | null
          preferred_learning_times: string[] | null
          skill_assessments: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_hours_per_week?: number | null
          career_goals?: string[] | null
          created_at?: string | null
          id?: string
          learning_preferences?: Json | null
          learning_style?: Json | null
          motivational_factors?: string[] | null
          preferred_learning_times?: string[] | null
          skill_assessments?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_hours_per_week?: number | null
          career_goals?: string[] | null
          created_at?: string | null
          id?: string
          learning_preferences?: Json | null
          learning_style?: Json | null
          motivational_factors?: string[] | null
          preferred_learning_times?: string[] | null
          skill_assessments?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      entry_roles: {
        Row: {
          avg_salary_range: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          avg_salary_range?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          avg_salary_range?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      equivalence_group_members: {
        Row: {
          confidence: number | null
          course_id: string
          created_at: string | null
          group_id: string
          id: string
          source: string
        }
        Insert: {
          confidence?: number | null
          course_id: string
          created_at?: string | null
          group_id: string
          id?: string
          source?: string
        }
        Update: {
          confidence?: number | null
          course_id?: string
          created_at?: string | null
          group_id?: string
          id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "equivalence_group_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equivalence_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equivalence_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      equivalence_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      error_taxonomy: {
        Row: {
          created_at: string
          error_category: string
          error_code: string
          id: string
          retry_strategy: string | null
          severity: string
          technical_message: string | null
          user_message: string
        }
        Insert: {
          created_at?: string
          error_category: string
          error_code: string
          id?: string
          retry_strategy?: string | null
          severity: string
          technical_message?: string | null
          user_message: string
        }
        Update: {
          created_at?: string
          error_category?: string
          error_code?: string
          id?: string
          retry_strategy?: string | null
          severity?: string
          technical_message?: string | null
          user_message?: string
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
            foreignKeyName: "featured_gallery_curations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "featured_gallery_curations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_intelligence_insights: {
        Row: {
          body: string | null
          created_at: string
          id: string
          insight_type: string
          metadata: Json
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          insight_type: string
          metadata?: Json
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          insight_type?: string
          metadata?: Json
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_metrics: {
        Row: {
          context_data: Json | null
          created_at: string
          id: string
          measurement_date: string
          measurement_period: string
          metric_type: string
          metric_value: number
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string
          id?: string
          measurement_date?: string
          measurement_period: string
          metric_type: string
          metric_value: number
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string
          id?: string
          measurement_date?: string
          measurement_period?: string
          metric_type?: string
          metric_value?: number
          user_id?: string
        }
        Relationships: []
      }
      gened_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string | null
          credits_required: number
          description: string | null
          display_order: number | null
          id: string
          institution_id: string
          metadata: Json | null
          min_grade: string | null
          updated_at: string | null
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string | null
          credits_required: number
          description?: string | null
          display_order?: number | null
          id?: string
          institution_id: string
          metadata?: Json | null
          min_grade?: string | null
          updated_at?: string | null
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string | null
          credits_required?: number
          description?: string | null
          display_order?: number | null
          id?: string
          institution_id?: string
          metadata?: Json | null
          min_grade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gened_categories_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      gened_frameworks: {
        Row: {
          created_at: string | null
          description: string | null
          framework_code: string
          framework_name: string
          id: string
          institution_id: string
          total_credits: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          framework_code: string
          framework_name: string
          id?: string
          institution_id: string
          total_credits: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          framework_code?: string
          framework_name?: string
          id?: string
          institution_id?: string
          total_credits?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gened_frameworks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_autonomous_actions: {
        Row: {
          action_description: string
          action_type: string
          applied_at: string | null
          confidence_score: number | null
          created_at: string | null
          goal_id: string
          id: string
          new_state: Json | null
          previous_state: Json | null
          user_approved: boolean | null
          user_id: string
        }
        Insert: {
          action_description: string
          action_type: string
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          goal_id: string
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          user_approved?: boolean | null
          user_id: string
        }
        Update: {
          action_description?: string
          action_type?: string
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          goal_id?: string
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          user_approved?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_autonomous_actions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "career_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_collaborations: {
        Row: {
          collaboration_type: string
          collaborator_user_id: string
          created_at: string | null
          goal_id: string
          id: string
          owner_user_id: string
          permissions: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          collaboration_type?: string
          collaborator_user_id: string
          created_at?: string | null
          goal_id: string
          id?: string
          owner_user_id: string
          permissions?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          collaboration_type?: string
          collaborator_user_id?: string
          created_at?: string | null
          goal_id?: string
          id?: string
          owner_user_id?: string
          permissions?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_collaborations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "career_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_intelligence_cache: {
        Row: {
          ai_insights: Json | null
          created_at: string | null
          difficulty_score: number | null
          goal_id: string
          id: string
          last_analyzed_at: string | null
          market_score: number | null
          market_trends: Json | null
          recommended_timeline_weeks: number | null
          skill_gap_analysis: Json | null
          success_probability: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          created_at?: string | null
          difficulty_score?: number | null
          goal_id: string
          id?: string
          last_analyzed_at?: string | null
          market_score?: number | null
          market_trends?: Json | null
          recommended_timeline_weeks?: number | null
          skill_gap_analysis?: Json | null
          success_probability?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_insights?: Json | null
          created_at?: string | null
          difficulty_score?: number | null
          goal_id?: string
          id?: string
          last_analyzed_at?: string | null
          market_score?: number | null
          market_trends?: Json | null
          recommended_timeline_weeks?: number | null
          skill_gap_analysis?: Json | null
          success_probability?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_intelligence_cache_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "career_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_learning_paths: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          difficulty_level: number | null
          estimated_completion_weeks: number | null
          generated_by: string | null
          goal_id: string
          id: string
          is_active: boolean | null
          market_alignment_score: number | null
          path_nodes: Json
          path_type: string
          personalization_score: number | null
          success_rate: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          difficulty_level?: number | null
          estimated_completion_weeks?: number | null
          generated_by?: string | null
          goal_id: string
          id?: string
          is_active?: boolean | null
          market_alignment_score?: number | null
          path_nodes?: Json
          path_type?: string
          personalization_score?: number | null
          success_rate?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          difficulty_level?: number | null
          estimated_completion_weeks?: number | null
          generated_by?: string | null
          goal_id?: string
          id?: string
          is_active?: boolean | null
          market_alignment_score?: number | null
          path_nodes?: Json
          path_type?: string
          personalization_score?: number | null
          success_rate?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_learning_paths_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "career_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_market_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          auto_workflow_created: boolean | null
          created_at: string | null
          description: string
          goal_id: string
          id: string
          market_data: Json | null
          recommended_actions: Json | null
          resolved_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          auto_workflow_created?: boolean | null
          created_at?: string | null
          description: string
          goal_id: string
          id?: string
          market_data?: Json | null
          recommended_actions?: Json | null
          resolved_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          auto_workflow_created?: boolean | null
          created_at?: string | null
          description?: string
          goal_id?: string
          id?: string
          market_data?: Json | null
          recommended_actions?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_market_alerts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "career_goals"
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
      institution_credit_limits: {
        Row: {
          created_at: string | null
          credit_value: number
          id: string
          institution_id: string
          limit_type: string
          notes: string | null
          provider_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credit_value: number
          id?: string
          institution_id: string
          limit_type: string
          notes?: string | null
          provider_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credit_value?: number
          id?: string
          institution_id?: string
          limit_type?: string
          notes?: string | null
          provider_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_credit_limits_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_policy_ground_truth: {
        Row: {
          academic_year: string | null
          accepts_ap: boolean | null
          accepts_clep: boolean | null
          accepts_dsst: boolean | null
          accepts_portfolio: boolean | null
          accepts_tecep: boolean | null
          capstone_required: boolean | null
          cornerstone_required: boolean | null
          created_at: string | null
          id: string
          info_literacy_required: boolean | null
          institution: string
          last_verified_at: string | null
          max_ace_nccrs_credits: number | null
          max_transfer_credits: number | null
          notes: string | null
          residency_credits: number | null
          source_url: string | null
          updated_at: string | null
          verified_by: string | null
        }
        Insert: {
          academic_year?: string | null
          accepts_ap?: boolean | null
          accepts_clep?: boolean | null
          accepts_dsst?: boolean | null
          accepts_portfolio?: boolean | null
          accepts_tecep?: boolean | null
          capstone_required?: boolean | null
          cornerstone_required?: boolean | null
          created_at?: string | null
          id?: string
          info_literacy_required?: boolean | null
          institution: string
          last_verified_at?: string | null
          max_ace_nccrs_credits?: number | null
          max_transfer_credits?: number | null
          notes?: string | null
          residency_credits?: number | null
          source_url?: string | null
          updated_at?: string | null
          verified_by?: string | null
        }
        Update: {
          academic_year?: string | null
          accepts_ap?: boolean | null
          accepts_clep?: boolean | null
          accepts_dsst?: boolean | null
          accepts_portfolio?: boolean | null
          accepts_tecep?: boolean | null
          capstone_required?: boolean | null
          cornerstone_required?: boolean | null
          created_at?: string | null
          id?: string
          info_literacy_required?: boolean | null
          institution?: string
          last_verified_at?: string | null
          max_ace_nccrs_credits?: number | null
          max_transfer_credits?: number | null
          notes?: string | null
          residency_credits?: number | null
          source_url?: string | null
          updated_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      institution_policy_packs: {
        Row: {
          academic_year: string
          confidence_score: number | null
          created_at: string | null
          degree_level: string
          effective_end: string | null
          effective_start: string | null
          id: string
          institution: string
          last_verified_at: string | null
          merged_from_job_ids: string[] | null
          policy_json: Json
          source_scrape_ids: string[] | null
          status: string
          superseded_by: string | null
          updated_at: string | null
          verification_source: string | null
          verified_by: string | null
        }
        Insert: {
          academic_year: string
          confidence_score?: number | null
          created_at?: string | null
          degree_level?: string
          effective_end?: string | null
          effective_start?: string | null
          id?: string
          institution: string
          last_verified_at?: string | null
          merged_from_job_ids?: string[] | null
          policy_json: Json
          source_scrape_ids?: string[] | null
          status?: string
          superseded_by?: string | null
          updated_at?: string | null
          verification_source?: string | null
          verified_by?: string | null
        }
        Update: {
          academic_year?: string
          confidence_score?: number | null
          created_at?: string | null
          degree_level?: string
          effective_end?: string | null
          effective_start?: string | null
          id?: string
          institution?: string
          last_verified_at?: string | null
          merged_from_job_ids?: string[] | null
          policy_json?: Json
          source_scrape_ids?: string[] | null
          status?: string
          superseded_by?: string | null
          updated_at?: string | null
          verification_source?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_policy_packs_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "institution_policy_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          accreditation_level: string | null
          code: string
          created_at: string
          description: string | null
          established_year: number | null
          id: string
          location: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          reputation_score: number | null
          type: string
          updated_at: string
          verification_status: string | null
          website_url: string | null
        }
        Insert: {
          accreditation_level?: string | null
          code: string
          created_at?: string
          description?: string | null
          established_year?: number | null
          id?: string
          location?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          reputation_score?: number | null
          type: string
          updated_at?: string
          verification_status?: string | null
          website_url?: string | null
        }
        Update: {
          accreditation_level?: string | null
          code?: string
          created_at?: string
          description?: string | null
          established_year?: number | null
          id?: string
          location?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          reputation_score?: number | null
          type?: string
          updated_at?: string
          verification_status?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      instructor_profiles: {
        Row: {
          average_rating: number | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          last_prestige_calc_at: string | null
          linkedin_url: string | null
          name: string
          prestige_score: number | null
          prestige_tier: string | null
          profile_image_url: string | null
          specialization_areas: string[] | null
          total_courses: number | null
          total_students: number | null
          updated_at: string | null
          verification_documents: Json | null
          verification_status: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          average_rating?: number | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_prestige_calc_at?: string | null
          linkedin_url?: string | null
          name: string
          prestige_score?: number | null
          prestige_tier?: string | null
          profile_image_url?: string | null
          specialization_areas?: string[] | null
          total_courses?: number | null
          total_students?: number | null
          updated_at?: string | null
          verification_documents?: Json | null
          verification_status?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          average_rating?: number | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_prestige_calc_at?: string | null
          linkedin_url?: string | null
          name?: string
          prestige_score?: number | null
          prestige_tier?: string | null
          profile_image_url?: string | null
          specialization_areas?: string[] | null
          total_courses?: number | null
          total_students?: number | null
          updated_at?: string | null
          verification_documents?: Json | null
          verification_status?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      instructor_ratings: {
        Row: {
          content_expertise: number | null
          course_id: string
          created_at: string | null
          engagement_level: number | null
          id: string
          instructor_id: string
          overall_rating: number | null
          response_time: number | null
          review_text: string | null
          teaching_quality: number | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
          would_recommend: boolean | null
        }
        Insert: {
          content_expertise?: number | null
          course_id: string
          created_at?: string | null
          engagement_level?: number | null
          id?: string
          instructor_id: string
          overall_rating?: number | null
          response_time?: number | null
          review_text?: string | null
          teaching_quality?: number | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          content_expertise?: number | null
          course_id?: string
          created_at?: string | null
          engagement_level?: number | null
          id?: string
          instructor_id?: string
          overall_rating?: number | null
          response_time?: number | null
          review_text?: string | null
          teaching_quality?: number | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_ratings_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          meta: Json | null
          name: string
          platform_id: string | null
          prestige_score: number | null
          profile_url: string | null
          rating_avg: number | null
          total_courses: number | null
          total_students: number | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          name: string
          platform_id?: string | null
          prestige_score?: number | null
          profile_url?: string | null
          rating_avg?: number | null
          total_courses?: number | null
          total_students?: number | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          name?: string
          platform_id?: string | null
          prestige_score?: number | null
          profile_url?: string | null
          rating_avg?: number | null
          total_courses?: number | null
          total_students?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructors_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "course_platforms"
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
      learning_challenges: {
        Row: {
          badge_reward_id: string | null
          career_paths: string[] | null
          challenge_data: Json
          challenge_type: string
          created_at: string
          created_by: string
          description: string
          difficulty_level: string
          end_date: string
          entry_requirements: Json | null
          id: string
          max_participants: number | null
          skill_focus: string[] | null
          start_date: string
          status: string
          title: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          badge_reward_id?: string | null
          career_paths?: string[] | null
          challenge_data?: Json
          challenge_type?: string
          created_at?: string
          created_by: string
          description: string
          difficulty_level?: string
          end_date: string
          entry_requirements?: Json | null
          id?: string
          max_participants?: number | null
          skill_focus?: string[] | null
          start_date: string
          status?: string
          title: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          badge_reward_id?: string | null
          career_paths?: string[] | null
          challenge_data?: Json
          challenge_type?: string
          created_at?: string
          created_by?: string
          description?: string
          difficulty_level?: string
          end_date?: string
          entry_requirements?: Json | null
          id?: string
          max_participants?: number | null
          skill_focus?: string[] | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      learning_engagement_sessions: {
        Row: {
          activity_data: Json
          completion_percentage: number | null
          course_id: string | null
          created_at: string
          difficulty_feedback: number | null
          duration_minutes: number | null
          ended_at: string | null
          engagement_score: number | null
          focus_events: Json | null
          id: string
          learning_velocity: number | null
          retention_indicators: Json | null
          session_notes: string | null
          session_type: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_data?: Json
          completion_percentage?: number | null
          course_id?: string | null
          created_at?: string
          difficulty_feedback?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          engagement_score?: number | null
          focus_events?: Json | null
          id?: string
          learning_velocity?: number | null
          retention_indicators?: Json | null
          session_notes?: string | null
          session_type?: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_data?: Json
          completion_percentage?: number | null
          course_id?: string | null
          created_at?: string
          difficulty_feedback?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          engagement_score?: number | null
          focus_events?: Json | null
          id?: string
          learning_velocity?: number | null
          retention_indicators?: Json | null
          session_notes?: string | null
          session_type?: string
          started_at?: string
          updated_at?: string
          user_id?: string
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
      learning_sessions: {
        Row: {
          completion_rate: number | null
          created_at: string | null
          difficulty_feedback: number | null
          duration_minutes: number | null
          end_time: string | null
          engagement_score: number | null
          id: string
          mastered_concepts: string[] | null
          node_id: string
          node_title: string
          notes: string | null
          start_time: string
          struggled_concepts: string[] | null
          user_id: string
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string | null
          difficulty_feedback?: number | null
          duration_minutes?: number | null
          end_time?: string | null
          engagement_score?: number | null
          id?: string
          mastered_concepts?: string[] | null
          node_id: string
          node_title: string
          notes?: string | null
          start_time: string
          struggled_concepts?: string[] | null
          user_id: string
        }
        Update: {
          completion_rate?: number | null
          created_at?: string | null
          difficulty_feedback?: number | null
          duration_minutes?: number | null
          end_time?: string | null
          engagement_score?: number | null
          id?: string
          mastered_concepts?: string[] | null
          node_id?: string
          node_title?: string
          notes?: string | null
          start_time?: string
          struggled_concepts?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      learning_social_actions: {
        Row: {
          action_data: Json
          action_type: string
          created_at: string
          id: string
          target_id: string
          target_type: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          action_data?: Json
          action_type: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          target_user_id: string
          user_id: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_streaks: {
        Row: {
          bonus_multiplier: number
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string
          longest_streak: number
          streak_start_date: string
          streak_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_multiplier?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string
          longest_streak?: number
          streak_start_date?: string
          streak_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_multiplier?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string
          longest_streak?: number
          streak_start_date?: string
          streak_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      life_path_edges: {
        Row: {
          confidence: number | null
          created_at: string | null
          credit_transfer_rate: number | null
          data_source: string | null
          edge_type: string
          id: string
          metadata: Json | null
          source_id: string
          target_id: string
          updated_at: string | null
          validated: boolean | null
          weight_cost: number | null
          weight_credit_loss: number | null
          weight_difficulty: number | null
          weight_roi: number | null
          weight_time: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          credit_transfer_rate?: number | null
          data_source?: string | null
          edge_type: string
          id?: string
          metadata?: Json | null
          source_id: string
          target_id: string
          updated_at?: string | null
          validated?: boolean | null
          weight_cost?: number | null
          weight_credit_loss?: number | null
          weight_difficulty?: number | null
          weight_roi?: number | null
          weight_time?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          credit_transfer_rate?: number | null
          data_source?: string | null
          edge_type?: string
          id?: string
          metadata?: Json | null
          source_id?: string
          target_id?: string
          updated_at?: string | null
          validated?: boolean | null
          weight_cost?: number | null
          weight_credit_loss?: number | null
          weight_difficulty?: number | null
          weight_roi?: number | null
          weight_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "life_path_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "life_path_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_path_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "life_path_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      life_path_nodes: {
        Row: {
          ace_recommended: boolean | null
          active: boolean | null
          cost: number | null
          created_at: string | null
          credits: number | null
          description: string | null
          difficulty: number | null
          estimated_hours: number | null
          id: string
          institution: string | null
          metadata: Json | null
          modality: string | null
          node_type: string
          position_x: number | null
          position_y: number | null
          prerequisite_ids: string[] | null
          provider: string | null
          skill_outcomes: string[] | null
          tags: string[] | null
          title: string
          updated_at: string | null
          validated: boolean | null
        }
        Insert: {
          ace_recommended?: boolean | null
          active?: boolean | null
          cost?: number | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          difficulty?: number | null
          estimated_hours?: number | null
          id?: string
          institution?: string | null
          metadata?: Json | null
          modality?: string | null
          node_type: string
          position_x?: number | null
          position_y?: number | null
          prerequisite_ids?: string[] | null
          provider?: string | null
          skill_outcomes?: string[] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          validated?: boolean | null
        }
        Update: {
          ace_recommended?: boolean | null
          active?: boolean | null
          cost?: number | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          difficulty?: number | null
          estimated_hours?: number | null
          id?: string
          institution?: string | null
          metadata?: Json | null
          modality?: string | null
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          prerequisite_ids?: string[] | null
          provider?: string | null
          skill_outcomes?: string[] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          validated?: boolean | null
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
      marketplace_courses: {
        Row: {
          ace_recommendation_id: string | null
          active: boolean | null
          code: string
          completion_rate: number | null
          cost_usd: number | null
          created_at: string | null
          credits: number
          cri_score: number | null
          delivery_mode:
            | Database["public"]["Enums"]["delivery_mode_enum"]
            | null
          description: string | null
          duration_weeks: number | null
          id: string
          instructor_rating: number | null
          level: number | null
          modality: Database["public"]["Enums"]["modality_type"] | null
          nccrs_course_id: string | null
          proctoring_required: boolean | null
          provider_id: string
          skill_tags: string[] | null
          start_dates: Json | null
          subject_area: string | null
          syllabus_text: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ace_recommendation_id?: string | null
          active?: boolean | null
          code: string
          completion_rate?: number | null
          cost_usd?: number | null
          created_at?: string | null
          credits?: number
          cri_score?: number | null
          delivery_mode?:
            | Database["public"]["Enums"]["delivery_mode_enum"]
            | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          instructor_rating?: number | null
          level?: number | null
          modality?: Database["public"]["Enums"]["modality_type"] | null
          nccrs_course_id?: string | null
          proctoring_required?: boolean | null
          provider_id: string
          skill_tags?: string[] | null
          start_dates?: Json | null
          subject_area?: string | null
          syllabus_text?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ace_recommendation_id?: string | null
          active?: boolean | null
          code?: string
          completion_rate?: number | null
          cost_usd?: number | null
          created_at?: string | null
          credits?: number
          cri_score?: number | null
          delivery_mode?:
            | Database["public"]["Enums"]["delivery_mode_enum"]
            | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          instructor_rating?: number | null
          level?: number | null
          modality?: Database["public"]["Enums"]["modality_type"] | null
          nccrs_course_id?: string | null
          proctoring_required?: boolean | null
          provider_id?: string
          skill_tags?: string[] | null
          start_dates?: Json | null
          subject_area?: string | null
          syllabus_text?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_courses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_courses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "requirement_options_view"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "marketplace_courses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "requirement_options_view_by_block"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      maya_context_tracking: {
        Row: {
          context_data: Json
          context_type: string
          created_at: string
          event_type: string
          id: string
          session_id: string | null
          tracked_at: string
          user_id: string
        }
        Insert: {
          context_data?: Json
          context_type: string
          created_at?: string
          event_type: string
          id?: string
          session_id?: string | null
          tracked_at?: string
          user_id: string
        }
        Update: {
          context_data?: Json
          context_type?: string
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string | null
          tracked_at?: string
          user_id?: string
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
      maya_feedback_correlations: {
        Row: {
          correlation_score: number | null
          created_at: string
          feedback_data: Json
          feedback_effectiveness: number | null
          feedback_type: string
          id: string
          long_term_impact: Json | null
          measured_at: string
          outcome_metrics: Json | null
          time_to_action_hours: number | null
          user_action: string | null
          user_id: string
        }
        Insert: {
          correlation_score?: number | null
          created_at?: string
          feedback_data: Json
          feedback_effectiveness?: number | null
          feedback_type: string
          id?: string
          long_term_impact?: Json | null
          measured_at?: string
          outcome_metrics?: Json | null
          time_to_action_hours?: number | null
          user_action?: string | null
          user_id: string
        }
        Update: {
          correlation_score?: number | null
          created_at?: string
          feedback_data?: Json
          feedback_effectiveness?: number | null
          feedback_type?: string
          id?: string
          long_term_impact?: Json | null
          measured_at?: string
          outcome_metrics?: Json | null
          time_to_action_hours?: number | null
          user_action?: string | null
          user_id?: string
        }
        Relationships: []
      }
      maya_learning_paths: {
        Row: {
          ai_confidence: number | null
          average_outcome_score: number | null
          completion_rate: number | null
          course_sequence: Json
          created_at: string
          created_by: string | null
          estimated_duration_weeks: number | null
          id: string
          market_demand_score: number | null
          maya_reasoning: string | null
          mentor_endorsements: string[] | null
          mentor_validation_status: string | null
          path_description: string | null
          path_name: string
          skill_level: string
          target_career: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          average_outcome_score?: number | null
          completion_rate?: number | null
          course_sequence?: Json
          created_at?: string
          created_by?: string | null
          estimated_duration_weeks?: number | null
          id?: string
          market_demand_score?: number | null
          maya_reasoning?: string | null
          mentor_endorsements?: string[] | null
          mentor_validation_status?: string | null
          path_description?: string | null
          path_name: string
          skill_level?: string
          target_career: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          average_outcome_score?: number | null
          completion_rate?: number | null
          course_sequence?: Json
          created_at?: string
          created_by?: string | null
          estimated_duration_weeks?: number | null
          id?: string
          market_demand_score?: number | null
          maya_reasoning?: string | null
          mentor_endorsements?: string[] | null
          mentor_validation_status?: string | null
          path_description?: string | null
          path_name?: string
          skill_level?: string
          target_career?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maya_learning_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
        ]
      }
      maya_proactive_insights: {
        Row: {
          acted_upon_at: string | null
          category: string
          confidence_score: number
          content: string
          context_data: Json
          created_at: string
          dismissed_at: string | null
          expires_at: string | null
          feedback_rating: number | null
          id: string
          insight_type: string
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acted_upon_at?: string | null
          category?: string
          confidence_score?: number
          content: string
          context_data?: Json
          created_at?: string
          dismissed_at?: string | null
          expires_at?: string | null
          feedback_rating?: number | null
          id?: string
          insight_type?: string
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acted_upon_at?: string | null
          category?: string
          confidence_score?: number
          content?: string
          context_data?: Json
          created_at?: string
          dismissed_at?: string | null
          expires_at?: string | null
          feedback_rating?: number | null
          id?: string
          insight_type?: string
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maya_rate_limits: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      mentor_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          badge_emoji: string | null
          description: string | null
          earned_at: string
          id: string
          mentor_id: string
          metadata: Json | null
          points_awarded: number | null
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          badge_emoji?: string | null
          description?: string | null
          earned_at?: string
          id?: string
          mentor_id: string
          metadata?: Json | null
          points_awarded?: number | null
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          badge_emoji?: string | null
          description?: string | null
          earned_at?: string
          id?: string
          mentor_id?: string
          metadata?: Json | null
          points_awarded?: number | null
        }
        Relationships: []
      }
      mentor_course_curations: {
        Row: {
          career_path_mappings: string[] | null
          course_id: string
          created_at: string
          curation_type: string
          endorsement_level: string | null
          expertise_score: number | null
          id: string
          mentor_id: string
          mentor_notes: string | null
          outcome_prediction: string | null
          roi_assessment: number | null
          skill_tags_added: string[] | null
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          career_path_mappings?: string[] | null
          course_id: string
          created_at?: string
          curation_type?: string
          endorsement_level?: string | null
          expertise_score?: number | null
          id?: string
          mentor_id: string
          mentor_notes?: string | null
          outcome_prediction?: string | null
          roi_assessment?: number | null
          skill_tags_added?: string[] | null
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          career_path_mappings?: string[] | null
          course_id?: string
          created_at?: string
          curation_type?: string
          endorsement_level?: string | null
          expertise_score?: number | null
          id?: string
          mentor_id?: string
          mentor_notes?: string | null
          outcome_prediction?: string | null
          roi_assessment?: number | null
          skill_tags_added?: string[] | null
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_course_curations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mentor_course_feedback: {
        Row: {
          completed_course: boolean | null
          course_id: string
          course_quality_rating: number | null
          created_at: string
          feedback_text: string | null
          id: string
          learning_outcome_rating: number | null
          mentor_id: string
          rating: number
          student_id: string
          would_recommend: boolean | null
        }
        Insert: {
          completed_course?: boolean | null
          course_id: string
          course_quality_rating?: number | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          learning_outcome_rating?: number | null
          mentor_id: string
          rating: number
          student_id: string
          would_recommend?: boolean | null
        }
        Update: {
          completed_course?: boolean | null
          course_id?: string
          course_quality_rating?: number | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          learning_outcome_rating?: number | null
          mentor_id?: string
          rating?: number
          student_id?: string
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      mentor_discussion_replies: {
        Row: {
          content: string
          created_at: string
          discussion_id: string
          id: string
          mentor_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          discussion_id: string
          id?: string
          mentor_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          discussion_id?: string
          id?: string
          mentor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "mentor_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_discussions: {
        Row: {
          content: string
          course_id: string
          created_at: string
          discussion_type: string
          id: string
          is_resolved: boolean | null
          mentor_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          discussion_type: string
          id?: string
          is_resolved?: boolean | null
          mentor_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          discussion_type?: string
          id?: string
          is_resolved?: boolean | null
          mentor_id?: string
          title?: string
          updated_at?: string
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
      mentor_leaderboard: {
        Row: {
          created_at: string
          id: string
          impact_score: number | null
          mentor_id: string
          period_end: string
          period_start: string
          period_type: string
          quality_score: number | null
          rank_position: number
          speed_score: number | null
          total_points: number | null
          updated_at: string
          validation_score: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          impact_score?: number | null
          mentor_id: string
          period_end: string
          period_start: string
          period_type: string
          quality_score?: number | null
          rank_position: number
          speed_score?: number | null
          total_points?: number | null
          updated_at?: string
          validation_score?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          impact_score?: number | null
          mentor_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          quality_score?: number | null
          rank_position?: number
          speed_score?: number | null
          total_points?: number | null
          updated_at?: string
          validation_score?: number | null
        }
        Relationships: []
      }
      mentor_path_curations: {
        Row: {
          changes_made: Json
          created_at: string
          curation_type: string
          id: string
          mentor_id: string
          path_id: string
        }
        Insert: {
          changes_made?: Json
          created_at?: string
          curation_type: string
          id?: string
          mentor_id: string
          path_id: string
        }
        Update: {
          changes_made?: Json
          created_at?: string
          curation_type?: string
          id?: string
          mentor_id?: string
          path_id?: string
        }
        Relationships: []
      }
      mentor_path_integrations: {
        Row: {
          course_id: string
          created_at: string
          id: string
          integration_data: Json
          mentor_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          integration_data?: Json
          mentor_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          integration_data?: Json
          mentor_id?: string
        }
        Relationships: []
      }
      mentor_performance_metrics: {
        Row: {
          avg_review_time_hours: number | null
          courses_approved: number | null
          courses_rejected: number | null
          courses_reviewed: number | null
          created_at: string
          id: string
          impact_score: number | null
          mentor_id: string
          period_end: string
          period_start: string
          quality_score: number | null
          student_engagement_score: number | null
          updated_at: string
        }
        Insert: {
          avg_review_time_hours?: number | null
          courses_approved?: number | null
          courses_rejected?: number | null
          courses_reviewed?: number | null
          created_at?: string
          id?: string
          impact_score?: number | null
          mentor_id: string
          period_end: string
          period_start: string
          quality_score?: number | null
          student_engagement_score?: number | null
          updated_at?: string
        }
        Update: {
          avg_review_time_hours?: number | null
          courses_approved?: number | null
          courses_rejected?: number | null
          courses_reviewed?: number | null
          created_at?: string
          id?: string
          impact_score?: number | null
          mentor_id?: string
          period_end?: string
          period_start?: string
          quality_score?: number | null
          student_engagement_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      micro_goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          estimated_duration: string | null
          id: string
          metadata: Json | null
          priority: string | null
          source_hub: string
          source_item_id: string
          source_item_type: string
          status: string | null
          suggested_due_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          source_hub: string
          source_item_id: string
          source_item_type: string
          status?: string | null
          suggested_due_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          source_hub?: string
          source_item_id?: string
          source_item_type?: string
          status?: string | null
          suggested_due_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      motivation_interventions: {
        Row: {
          confidence_score: number | null
          created_at: string
          effectiveness_score: number | null
          id: string
          implementation_notes: string | null
          intervention_data: Json
          intervention_type: string
          response_at: string | null
          suggested_at: string
          trigger_conditions: Json
          user_id: string
          user_response: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          effectiveness_score?: number | null
          id?: string
          implementation_notes?: string | null
          intervention_data: Json
          intervention_type: string
          response_at?: string | null
          suggested_at?: string
          trigger_conditions: Json
          user_id: string
          user_response?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          effectiveness_score?: number | null
          id?: string
          implementation_notes?: string | null
          intervention_data?: Json
          intervention_type?: string
          response_at?: string | null
          suggested_at?: string
          trigger_conditions?: Json
          user_id?: string
          user_response?: string | null
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
      option_exclusions: {
        Row: {
          created_at: string | null
          id: string
          option_a_id: string
          option_b_id: string
          reason: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_a_id: string
          option_b_id: string
          reason?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_a_id?: string
          option_b_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_exclusions_option_a_id_fkey"
            columns: ["option_a_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_exclusions_option_b_id_fkey"
            columns: ["option_b_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_policies: {
        Row: {
          created_at: string
          id: string
          max_alt_credits: number
          min_residency_credits: number
          notes: string | null
          partner_code: string
          partner_name: string
          updated_at: string
          upper_division_min: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_alt_credits?: number
          min_residency_credits?: number
          notes?: string | null
          partner_code: string
          partner_name: string
          updated_at?: string
          upper_division_min?: number
        }
        Update: {
          created_at?: string
          id?: string
          max_alt_credits?: number
          min_residency_credits?: number
          notes?: string | null
          partner_code?: string
          partner_name?: string
          updated_at?: string
          upper_division_min?: number
        }
        Relationships: []
      }
      partner_rules: {
        Row: {
          created_at: string | null
          id: string
          max_alt_credit: number | null
          max_transfer_credits: number | null
          partner: string
          residency_credits: number | null
          upper_division_min: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_alt_credit?: number | null
          max_transfer_credits?: number | null
          partner: string
          residency_credits?: number | null
          upper_division_min?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_alt_credit?: number | null
          max_transfer_credits?: number | null
          partner?: string
          residency_credits?: number | null
          upper_division_min?: number | null
        }
        Relationships: []
      }
      path_edges: {
        Row: {
          created_at: string | null
          edge_data: Json | null
          edge_id: string
          edge_type: string
          id: string
          path_id: string
          source_node_id: string
          target_node_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          edge_data?: Json | null
          edge_id: string
          edge_type: string
          id?: string
          path_id: string
          source_node_id: string
          target_node_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          edge_data?: Json | null
          edge_id?: string
          edge_type?: string
          id?: string
          path_id?: string
          source_node_id?: string
          target_node_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "path_edges_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "user_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      path_nodes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          node_data: Json | null
          node_id: string
          node_type: string
          path_id: string
          position_x: number
          position_y: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          node_data?: Json | null
          node_id: string
          node_type: string
          path_id: string
          position_x?: number
          position_y?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          node_data?: Json | null
          node_id?: string
          node_type?: string
          path_id?: string
          position_x?: number
          position_y?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "path_nodes_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "user_paths"
            referencedColumns: ["id"]
          },
        ]
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
      peer_feedback: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          feedback_data: Json | null
          feedback_text: string | null
          feedback_type: string
          from_user_id: string
          id: string
          improvement_areas: string[] | null
          is_anonymous: boolean | null
          rating: number
          skills_endorsed: string[] | null
          to_user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string
          feedback_data?: Json | null
          feedback_text?: string | null
          feedback_type: string
          from_user_id: string
          id?: string
          improvement_areas?: string[] | null
          is_anonymous?: boolean | null
          rating: number
          skills_endorsed?: string[] | null
          to_user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          feedback_data?: Json | null
          feedback_text?: string | null
          feedback_type?: string
          from_user_id?: string
          id?: string
          improvement_areas?: string[] | null
          is_anonymous?: boolean | null
          rating?: number
          skills_endorsed?: string[] | null
          to_user_id?: string
        }
        Relationships: []
      }
      peer_learning_sessions: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          group_id: string | null
          id: string
          max_participants: number | null
          organizer_id: string
          scheduled_for: string
          session_data: Json | null
          session_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          group_id?: string | null
          id?: string
          max_participants?: number | null
          organizer_id: string
          scheduled_for: string
          session_data?: Json | null
          session_type?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          group_id?: string | null
          id?: string
          max_participants?: number | null
          organizer_id?: string
          scheduled_for?: string
          session_data?: Json | null
          session_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_learning_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
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
      phase1_test_results: {
        Row: {
          created_at: string | null
          id: string
          test_name: string
          test_result: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          test_name: string
          test_result?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          test_name?: string
          test_result?: Json | null
        }
        Relationships: []
      }
      phase6_baseline_snapshots: {
        Row: {
          baseline_data: Json
          captured_at: string
          created_at: string
          id: string
          metadata: Json | null
          snapshot_type: string
          system_health_score: number
          user_id: string
        }
        Insert: {
          baseline_data?: Json
          captured_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          snapshot_type?: string
          system_health_score?: number
          user_id: string
        }
        Update: {
          baseline_data?: Json
          captured_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          snapshot_type?: string
          system_health_score?: number
          user_id?: string
        }
        Relationships: []
      }
      phase6_enterprise_certifications: {
        Row: {
          audit_trail: Json | null
          certification_data: Json
          certification_type: string
          certified_at: string
          component_scores: Json
          created_at: string
          id: string
          overall_score: number
          user_id: string
          valid_until: string | null
        }
        Insert: {
          audit_trail?: Json | null
          certification_data?: Json
          certification_type?: string
          certified_at?: string
          component_scores?: Json
          created_at?: string
          id?: string
          overall_score: number
          user_id: string
          valid_until?: string | null
        }
        Update: {
          audit_trail?: Json | null
          certification_data?: Json
          certification_type?: string
          certified_at?: string
          component_scores?: Json
          created_at?: string
          id?: string
          overall_score?: number
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      phase6_validation_locks: {
        Row: {
          component_name: string
          component_state: Json
          created_by: string | null
          expires_at: string | null
          id: string
          lock_reason: string | null
          locked_at: string
          metadata: Json | null
          user_id: string
          validation_score: number
        }
        Insert: {
          component_name: string
          component_state?: Json
          created_by?: string | null
          expires_at?: string | null
          id?: string
          lock_reason?: string | null
          locked_at?: string
          metadata?: Json | null
          user_id: string
          validation_score: number
        }
        Update: {
          component_name?: string
          component_state?: Json
          created_by?: string | null
          expires_at?: string | null
          id?: string
          lock_reason?: string | null
          locked_at?: string
          metadata?: Json | null
          user_id?: string
          validation_score?: number
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
      placeholder_members: {
        Row: {
          course_id: string
          created_at: string
          id: string
          placeholder_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          placeholder_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          placeholder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placeholder_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placeholder_members_placeholder_id_fkey"
            columns: ["placeholder_id"]
            isOneToOne: false
            referencedRelation: "requirement_placeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_field_extractions: {
        Row: {
          confidence: number
          created_at: string | null
          extracted_value: Json | null
          field_path: string
          final_value: Json | null
          id: string
          job_id: string
          review_status: string
          reviewer_notes: string | null
          source_quote: string | null
          source_url: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string | null
          extracted_value?: Json | null
          field_path: string
          final_value?: Json | null
          id?: string
          job_id: string
          review_status?: string
          reviewer_notes?: string | null
          source_quote?: string | null
          source_url?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          extracted_value?: Json | null
          field_path?: string
          final_value?: Json | null
          id?: string
          job_id?: string
          review_status?: string
          reviewer_notes?: string | null
          source_quote?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_field_extractions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "school_scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          block_id: string | null
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          estimated_hours: number | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          estimated_hours?: number | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          block_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          estimated_hours?: number | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "requirement_blocks"
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
      prereq_to_block: {
        Row: {
          created_at: string | null
          id: string
          source_gate_id: string
          target_block_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_gate_id: string
          target_block_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_gate_id?: string
          target_block_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prereq_to_block_source_gate_id_fkey"
            columns: ["source_gate_id"]
            isOneToOne: false
            referencedRelation: "block_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prereq_to_block_target_block_id_fkey"
            columns: ["target_block_id"]
            isOneToOne: false
            referencedRelation: "requirement_blocks"
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
          data_completeness_score: number | null
          education: string | null
          email: string | null
          experience_level: string | null
          gallery_enabled: boolean | null
          gallery_featured: boolean | null
          headline: string | null
          id: string
          import_source: string | null
          industry: string | null
          interests: string[] | null
          last_import_at: string | null
          learning_style: string | null
          linkedin_id: string | null
          linkedin_url: string | null
          location: string | null
          name: string | null
          resume_review_summary: string | null
          role: string | null
          role_title: string | null
          salary_expectations: number | null
          skills: string[] | null
          summary: string | null
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
          data_completeness_score?: number | null
          education?: string | null
          email?: string | null
          experience_level?: string | null
          gallery_enabled?: boolean | null
          gallery_featured?: boolean | null
          headline?: string | null
          id?: string
          import_source?: string | null
          industry?: string | null
          interests?: string[] | null
          last_import_at?: string | null
          learning_style?: string | null
          linkedin_id?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          resume_review_summary?: string | null
          role?: string | null
          role_title?: string | null
          salary_expectations?: number | null
          skills?: string[] | null
          summary?: string | null
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
          data_completeness_score?: number | null
          education?: string | null
          email?: string | null
          experience_level?: string | null
          gallery_enabled?: boolean | null
          gallery_featured?: boolean | null
          headline?: string | null
          id?: string
          import_source?: string | null
          industry?: string | null
          interests?: string[] | null
          last_import_at?: string | null
          learning_style?: string | null
          linkedin_id?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          resume_review_summary?: string | null
          role?: string | null
          role_title?: string | null
          salary_expectations?: number | null
          skills?: string[] | null
          summary?: string | null
          updated_at?: string
          user_id?: string | null
          willing_to_relocate?: boolean | null
          work_preferences?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      program_outcomes: {
        Row: {
          created_at: string | null
          description: string
          id: string
          outcome_slug: string
          program_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          outcome_slug: string
          program_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          outcome_slug?: string
          program_id?: string
        }
        Relationships: []
      }
      program_requirements: {
        Row: {
          category: string
          created_at: string | null
          credits_required: number
          description: string | null
          id: string
          max_select: number | null
          min_select: number | null
          name: string
          program_id: string
          requirement_block_id: string | null
          track_id: string | null
          year: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          credits_required?: number
          description?: string | null
          id?: string
          max_select?: number | null
          min_select?: number | null
          name: string
          program_id: string
          requirement_block_id?: string | null
          track_id?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          credits_required?: number
          description?: string | null
          id?: string
          max_select?: number | null
          min_select?: number | null
          name?: string
          program_id?: string
          requirement_block_id?: string | null
          track_id?: string | null
          year?: number | null
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
      proof_project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          milestone_order: number
          project_id: string
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          milestone_order: number
          project_id: string
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          milestone_order?: number
          project_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "proof_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_project_skills: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          project_id: string
          skill_name: string
          validation_level: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          project_id: string
          skill_name: string
          validation_level?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          project_id?: string
          skill_name?: string
          validation_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_project_skills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "proof_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_projects: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string
          demo_url: string | null
          description: string | null
          difficulty_level: number | null
          estimated_hours: number | null
          github_url: string | null
          id: string
          project_data: Json | null
          project_type: string
          skills_to_validate: string[] | null
          status: string
          title: string
          track_id: string | null
          updated_at: string
          user_id: string
          validation_criteria: Json | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          difficulty_level?: number | null
          estimated_hours?: number | null
          github_url?: string | null
          id?: string
          project_data?: Json | null
          project_type?: string
          skills_to_validate?: string[] | null
          status?: string
          title: string
          track_id?: string | null
          updated_at?: string
          user_id: string
          validation_criteria?: Json | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          difficulty_level?: number | null
          estimated_hours?: number | null
          github_url?: string | null
          id?: string
          project_data?: Json | null
          project_type?: string
          skills_to_validate?: string[] | null
          status?: string
          title?: string
          track_id?: string | null
          updated_at?: string
          user_id?: string
          validation_criteria?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_projects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_projects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      providers: {
        Row: {
          accreditation: string | null
          ace_approved: boolean | null
          active: boolean | null
          country: string | null
          created_at: string | null
          id: string
          name: string
          nccrs_approved: boolean | null
          policies: Json | null
          provider_code: string | null
          reputation_score: number | null
          type: Database["public"]["Enums"]["provider_type"]
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          accreditation?: string | null
          ace_approved?: boolean | null
          active?: boolean | null
          country?: string | null
          created_at?: string | null
          id?: string
          name: string
          nccrs_approved?: boolean | null
          policies?: Json | null
          provider_code?: string | null
          reputation_score?: number | null
          type: Database["public"]["Enums"]["provider_type"]
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          accreditation?: string | null
          ace_approved?: boolean | null
          active?: boolean | null
          country?: string | null
          created_at?: string | null
          id?: string
          name?: string
          nccrs_approved?: boolean | null
          policies?: Json | null
          provider_code?: string | null
          reputation_score?: number | null
          type?: Database["public"]["Enums"]["provider_type"]
          updated_at?: string | null
          website_url?: string | null
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
      referral_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip: unknown
          referral_code: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip?: unknown
          referral_code: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip?: unknown
          referral_code?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          clicks: number
          created_at: string
          id: string
          referral_code: string | null
          signups: number
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          id?: string
          referral_code?: string | null
          signups?: number
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          id?: string
          referral_code?: string | null
          signups?: number
          user_id?: string
        }
        Relationships: []
      }
      requirement_blocks: {
        Row: {
          area: string
          created_at: string | null
          credits_needed: number | null
          hidden: boolean | null
          id: string
          is_virtual: boolean | null
          k: number | null
          level_year: number
          parent_block_id: string | null
          position_x: number | null
          position_y: number | null
          program_id: string | null
          rule_type: string
          slug: string | null
          title: string
          track_id: string | null
          updated_at: string | null
        }
        Insert: {
          area: string
          created_at?: string | null
          credits_needed?: number | null
          hidden?: boolean | null
          id?: string
          is_virtual?: boolean | null
          k?: number | null
          level_year: number
          parent_block_id?: string | null
          position_x?: number | null
          position_y?: number | null
          program_id?: string | null
          rule_type: string
          slug?: string | null
          title: string
          track_id?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string
          created_at?: string | null
          credits_needed?: number | null
          hidden?: boolean | null
          id?: string
          is_virtual?: boolean | null
          k?: number | null
          level_year?: number
          parent_block_id?: string | null
          position_x?: number | null
          position_y?: number | null
          program_id?: string | null
          rule_type?: string
          slug?: string | null
          title?: string
          track_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_blocks_parent_block_id_fkey"
            columns: ["parent_block_id"]
            isOneToOne: false
            referencedRelation: "requirement_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_catalog: {
        Row: {
          area: string | null
          canon_req_code: string
          created_at: string | null
          credits_typical: number | null
          description: string | null
          level_hint: number | null
          title: string
        }
        Insert: {
          area?: string | null
          canon_req_code: string
          created_at?: string | null
          credits_typical?: number | null
          description?: string | null
          level_hint?: number | null
          title: string
        }
        Update: {
          area?: string | null
          canon_req_code?: string
          created_at?: string | null
          credits_typical?: number | null
          description?: string | null
          level_hint?: number | null
          title?: string
        }
        Relationships: []
      }
      requirement_option_counts_by_block: {
        Row: {
          block_id: string
          has_ace_credit: boolean
          has_clep: boolean
          options_count: number
          updated_at: string
        }
        Insert: {
          block_id: string
          has_ace_credit?: boolean
          has_clep?: boolean
          options_count?: number
          updated_at?: string
        }
        Update: {
          block_id?: string
          has_ace_credit?: boolean
          has_clep?: boolean
          options_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      requirement_options: {
        Row: {
          created_at: string | null
          credits_awarded: number | null
          id: string
          min_grade: string | null
          notes: string | null
          option_kind: Database["public"]["Enums"]["option_kind"]
          option_ref_id: string
          requirement_id: string
          transfer_eligible: boolean | null
        }
        Insert: {
          created_at?: string | null
          credits_awarded?: number | null
          id?: string
          min_grade?: string | null
          notes?: string | null
          option_kind: Database["public"]["Enums"]["option_kind"]
          option_ref_id: string
          requirement_id: string
          transfer_eligible?: boolean | null
        }
        Update: {
          created_at?: string | null
          credits_awarded?: number | null
          id?: string
          min_grade?: string | null
          notes?: string | null
          option_kind?: Database["public"]["Enums"]["option_kind"]
          option_ref_id?: string
          requirement_id?: string
          transfer_eligible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_options_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "program_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_placeholders: {
        Row: {
          area: string
          created_at: string
          credits_needed: number | null
          id: string
          k: number | null
          level_year: number | null
          parent_block_id: string | null
          rule_type: string
          title: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          credits_needed?: number | null
          id?: string
          k?: number | null
          level_year?: number | null
          parent_block_id?: string | null
          rule_type: string
          title: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          credits_needed?: number | null
          id?: string
          k?: number | null
          level_year?: number | null
          parent_block_id?: string | null
          rule_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_placeholders_parent_block_id_fkey"
            columns: ["parent_block_id"]
            isOneToOne: false
            referencedRelation: "requirement_placeholders"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "role_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "role_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
        ]
      }
      role_requirements: {
        Row: {
          created_at: string | null
          role_id: string
          skill_id: string
          threshold: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          role_id: string
          skill_id: string
          threshold?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          role_id?: string
          skill_id?: string
          threshold?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "role_requirements_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "entry_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requirements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_benchmarks: {
        Row: {
          created_at: string
          currency: string
          demand_multiplier: number
          id: string
          region: string
          role: string
          salary_max: number
          salary_mid: number
          salary_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          demand_multiplier?: number
          id?: string
          region: string
          role: string
          salary_max?: number
          salary_mid?: number
          salary_min?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          demand_multiplier?: number
          id?: string
          region?: string
          role?: string
          salary_max?: number
          salary_mid?: number
          salary_min?: number
          updated_at?: string
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
      saved_plan_items: {
        Row: {
          added_from_hub: string
          created_at: string
          cri_boost_score: number | null
          cri_explanation: string | null
          description: string | null
          estimated_time_to_complete: string | null
          id: string
          item_id: string
          item_type: string
          metadata: Json | null
          priority: string
          skill_tags: string[] | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_from_hub?: string
          created_at?: string
          cri_boost_score?: number | null
          cri_explanation?: string | null
          description?: string | null
          estimated_time_to_complete?: string | null
          id?: string
          item_id: string
          item_type: string
          metadata?: Json | null
          priority?: string
          skill_tags?: string[] | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_from_hub?: string
          created_at?: string
          cri_boost_score?: number | null
          cri_explanation?: string | null
          description?: string | null
          estimated_time_to_complete?: string | null
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json | null
          priority?: string
          skill_tags?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
        ]
      }
      school_scrape_jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          extracted_data: Json | null
          id: string
          institution_code: string
          overall_confidence: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          scraped_content: Json | null
          status: string
          target_urls: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          institution_code: string
          overall_confidence?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scraped_content?: Json | null
          status?: string
          target_urls?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          institution_code?: string
          overall_confidence?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scraped_content?: Json | null
          status?: string
          target_urls?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      scrape_jobs: {
        Row: {
          allowed_scrape: boolean | null
          created_at: string | null
          error_message: string | null
          id: string
          institution: string
          job_type: string
          last_attempt_at: string | null
          merge_group_id: string | null
          priority: number | null
          retry_count: number | null
          robots_checked_at: string | null
          scrape_method: string
          source_authority_score: number | null
          source_type: string
          status: string
          updated_at: string | null
          url: string
        }
        Insert: {
          allowed_scrape?: boolean | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          institution: string
          job_type: string
          last_attempt_at?: string | null
          merge_group_id?: string | null
          priority?: number | null
          retry_count?: number | null
          robots_checked_at?: string | null
          scrape_method?: string
          source_authority_score?: number | null
          source_type?: string
          status?: string
          updated_at?: string | null
          url: string
        }
        Update: {
          allowed_scrape?: boolean | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          institution?: string
          job_type?: string
          last_attempt_at?: string | null
          merge_group_id?: string | null
          priority?: number | null
          retry_count?: number | null
          robots_checked_at?: string | null
          scrape_method?: string
          source_authority_score?: number | null
          source_type?: string
          status?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      scrape_url_templates: {
        Row: {
          created_at: string | null
          id: string
          institution_code: string
          last_scraped_at: string | null
          page_type: string
          priority: number
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_code: string
          last_scraped_at?: string | null
          page_type?: string
          priority?: number
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_code?: string
          last_scraped_at?: string | null
          page_type?: string
          priority?: number
          url?: string
        }
        Relationships: []
      }
      scraped_content: {
        Row: {
          ai_extracted_data: Json | null
          confidence_breakdown: Json | null
          content_tsv: unknown
          extracted_at: string | null
          extracted_text: string | null
          extraction_model: string | null
          extraction_prompt_version: string | null
          id: string
          raw_html: string | null
          scrape_job_id: string | null
          scraped_at: string | null
          source_type: string | null
          total_confidence_score: number | null
          url: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          confidence_breakdown?: Json | null
          content_tsv?: unknown
          extracted_at?: string | null
          extracted_text?: string | null
          extraction_model?: string | null
          extraction_prompt_version?: string | null
          id?: string
          raw_html?: string | null
          scrape_job_id?: string | null
          scraped_at?: string | null
          source_type?: string | null
          total_confidence_score?: number | null
          url: string
        }
        Update: {
          ai_extracted_data?: Json | null
          confidence_breakdown?: Json | null
          content_tsv?: unknown
          extracted_at?: string | null
          extracted_text?: string | null
          extraction_model?: string | null
          extraction_prompt_version?: string | null
          id?: string
          raw_html?: string | null
          scrape_job_id?: string | null
          scraped_at?: string | null
          source_type?: string | null
          total_confidence_score?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_content_scrape_job_id_fkey"
            columns: ["scrape_job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      session_participants: {
        Row: {
          attendance_status: string
          contribution_rating: number | null
          feedback: string | null
          id: string
          registered_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          attendance_status?: string
          contribution_rating?: number | null
          feedback?: string | null
          id?: string
          registered_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          attendance_status?: string
          contribution_rating?: number | null
          feedback?: string | null
          id?: string
          registered_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "peer_learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_automation_risk: {
        Row: {
          automation_risk_pct: number
          created_at: string
          horizon_years: number
          id: string
          skill_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          automation_risk_pct?: number
          created_at?: string
          horizon_years?: number
          id?: string
          skill_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          automation_risk_pct?: number
          created_at?: string
          horizon_years?: number
          id?: string
          skill_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
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
      skill_extractions: {
        Row: {
          confidence_score: number
          context_snippet: string | null
          created_at: string | null
          extraction_source: string
          id: string
          import_id: string | null
          metadata: Json | null
          skill_category: string | null
          skill_name: string
          user_id: string
          validated: boolean | null
        }
        Insert: {
          confidence_score?: number
          context_snippet?: string | null
          created_at?: string | null
          extraction_source: string
          id?: string
          import_id?: string | null
          metadata?: Json | null
          skill_category?: string | null
          skill_name: string
          user_id: string
          validated?: boolean | null
        }
        Update: {
          confidence_score?: number
          context_snippet?: string | null
          created_at?: string | null
          extraction_source?: string
          id?: string
          import_id?: string | null
          metadata?: Json | null
          skill_category?: string | null
          skill_name?: string
          user_id?: string
          validated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_extractions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "data_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_extractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
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
      social_leaderboards: {
        Row: {
          id: string
          last_updated: string
          leaderboard_data: Json
          leaderboard_type: string
          period_end: string
          period_start: string
          scope_filter: Json | null
          time_period: string
        }
        Insert: {
          id?: string
          last_updated?: string
          leaderboard_data?: Json
          leaderboard_type: string
          period_end: string
          period_start: string
          scope_filter?: Json | null
          time_period?: string
        }
        Update: {
          id?: string
          last_updated?: string
          leaderboard_data?: Json
          leaderboard_type?: string
          period_end?: string
          period_start?: string
          scope_filter?: Json | null
          time_period?: string
        }
        Relationships: []
      }
      social_learning_analytics: {
        Row: {
          calculated_at: string
          calculation_period: string
          id: string
          metric_data: Json | null
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          calculated_at?: string
          calculation_period?: string
          id?: string
          metric_data?: Json | null
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          calculated_at?: string
          calculation_period?: string
          id?: string
          metric_data?: Json | null
          metric_type?: string
          metric_value?: number
          period_end?: string
          period_start?: string
          user_id?: string
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
      student_course_map: {
        Row: {
          catalog_course_id: string
          confidence: number | null
          created_at: string
          id: string
          method: string | null
          raw_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          catalog_course_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          method?: string | null
          raw_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          catalog_course_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          method?: string | null
          raw_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_course_map_raw_id_fkey"
            columns: ["raw_id"]
            isOneToOne: false
            referencedRelation: "student_courses_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      student_courses_raw: {
        Row: {
          created_at: string
          credits: number | null
          doc_id: string | null
          grade: string | null
          id: string
          institution: string | null
          number: string | null
          raw_line: string | null
          subject: string | null
          term: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number | null
          doc_id?: string | null
          grade?: string | null
          id?: string
          institution?: string | null
          number?: string | null
          raw_line?: string | null
          subject?: string | null
          term?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number | null
          doc_id?: string | null
          grade?: string | null
          id?: string
          institution?: string | null
          number?: string | null
          raw_line?: string | null
          subject?: string | null
          term?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_raw_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          created_at: string
          id: string
          parsed_json: Json | null
          source: string
          storage_path: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parsed_json?: Json | null
          source: string
          storage_path: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parsed_json?: Json | null
          source?: string
          storage_path?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_experiences: {
        Row: {
          created_at: string
          doc_id: string | null
          employer: string | null
          end_date: string | null
          id: string
          normalized_tags: string[] | null
          role: string | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_id?: string | null
          employer?: string | null
          end_date?: string | null
          id?: string
          normalized_tags?: string[] | null
          role?: string | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          doc_id?: string | null
          employer?: string | null
          end_date?: string | null
          id?: string
          normalized_tags?: string[] | null
          role?: string | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_experiences_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      student_skills: {
        Row: {
          confidence: number | null
          created_at: string
          doc_id: string | null
          id: string
          skill: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          doc_id?: string | null
          id?: string
          skill: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          doc_id?: string | null
          id?: string
          skill?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_skills_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          contribution_score: number | null
          group_id: string
          id: string
          joined_at: string
          last_active_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          contribution_score?: number | null
          group_id: string
          id?: string
          joined_at?: string
          last_active_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          contribution_score?: number | null
          group_id?: string
          id?: string
          joined_at?: string
          last_active_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          active_challenge_id: string | null
          career_path: string
          created_at: string
          creator_id: string
          description: string | null
          group_type: string
          id: string
          max_members: number | null
          name: string
          privacy_level: string
          skill_focus: string[] | null
          updated_at: string
        }
        Insert: {
          active_challenge_id?: string | null
          career_path: string
          created_at?: string
          creator_id: string
          description?: string | null
          group_type?: string
          id?: string
          max_members?: number | null
          name: string
          privacy_level?: string
          skill_focus?: string[] | null
          updated_at?: string
        }
        Update: {
          active_challenge_id?: string | null
          career_path?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          group_type?: string
          id?: string
          max_members?: number | null
          name?: string
          privacy_level?: string
          skill_focus?: string[] | null
          updated_at?: string
        }
        Relationships: []
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
      switching_scenarios: {
        Row: {
          assumptions: Json
          config: Json
          created_at: string
          from_track_id: string | null
          id: string
          last_run_at: string | null
          locations: Json
          metrics: Json
          name: string
          results: Json
          status: string
          to_track_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assumptions?: Json
          config?: Json
          created_at?: string
          from_track_id?: string | null
          id?: string
          last_run_at?: string | null
          locations?: Json
          metrics?: Json
          name?: string
          results?: Json
          status?: string
          to_track_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assumptions?: Json
          config?: Json
          created_at?: string
          from_track_id?: string | null
          id?: string
          last_run_at?: string | null
          locations?: Json
          metrics?: Json
          name?: string
          results?: Json
          status?: string
          to_track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_performance_metrics: {
        Row: {
          created_at: string
          id: string
          measurement_unit: string | null
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          recorded_at: string
          target_value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          measurement_unit?: string | null
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          recorded_at?: string
          target_value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          measurement_unit?: string | null
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          recorded_at?: string
          target_value?: number | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          average_rating: number | null
          bio: string | null
          created_at: string
          credentials: Json | null
          experience_years: number | null
          id: string
          institution_id: string | null
          name: string
          outcome_score: number | null
          profile_image_url: string | null
          response_rate: number | null
          social_links: Json | null
          specializations: string[] | null
          title: string | null
          total_reviews: number | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          credentials?: Json | null
          experience_years?: number | null
          id?: string
          institution_id?: string | null
          name: string
          outcome_score?: number | null
          profile_image_url?: string | null
          response_rate?: number | null
          social_links?: Json | null
          specializations?: string[] | null
          title?: string | null
          total_reviews?: number | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          credentials?: Json | null
          experience_years?: number | null
          id?: string
          institution_id?: string | null
          name?: string
          outcome_score?: number | null
          profile_image_url?: string | null
          response_rate?: number | null
          social_links?: Json | null
          specializations?: string[] | null
          title?: string | null
          total_reviews?: number | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_courses: {
        Row: {
          course_code: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          educator_id: string
          end_date: string | null
          enrollment_capacity: number | null
          enrollment_count: number | null
          id: string
          skill_tags: string[] | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_code?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          educator_id: string
          end_date?: string | null
          enrollment_capacity?: number | null
          enrollment_count?: number | null
          id?: string
          skill_tags?: string[] | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_code?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          educator_id?: string
          end_date?: string | null
          enrollment_capacity?: number | null
          enrollment_count?: number | null
          id?: string
          skill_tags?: string[] | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      track_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          track_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          track_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_courses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_courses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      track_cri_cache: {
        Row: {
          breakdown: Json
          cri: number
          gaps: Json | null
          recommendations: Json | null
          skill_levels: Json | null
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          breakdown?: Json
          cri?: number
          gaps?: Json | null
          recommendations?: Json | null
          skill_levels?: Json | null
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          breakdown?: Json
          cri?: number
          gaps?: Json | null
          recommendations?: Json | null
          skill_levels?: Json | null
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_cri_cache_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_mentor_verifications: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          impact_notes: string | null
          mentor_id: string
          status: string
          track_id: string
          user_id: string
          verification_data: Json
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          impact_notes?: string | null
          mentor_id: string
          status?: string
          track_id: string
          user_id: string
          verification_data?: Json
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          impact_notes?: string | null
          mentor_id?: string
          status?: string
          track_id?: string
          user_id?: string
          verification_data?: Json
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_mentor_verifications_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_mentor_verifications_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      track_projects: {
        Row: {
          created_at: string
          id: string
          project_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_projects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_projects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      track_skills: {
        Row: {
          created_at: string
          id: string
          skill_node_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skill_node_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skill_node_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_skills_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "career_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_skills_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_skills_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      track_steps: {
        Row: {
          created_at: string
          id: string
          step_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          step_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          step_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_steps_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "career_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_steps_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_steps_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      tracks: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          estimated_duration_weeks: number | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_weeks?: number | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_weeks?: number | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          course_url: string | null
          created_at: string
          credits: number | null
          credits_earned: number | null
          cri_score: number | null
          description: string | null
          difficulty: string | null
          grade: string | null
          id: string
          institution_grade: string | null
          institution_id: string | null
          skill_tags: string[] | null
          teacher_id: string | null
          title: string
          track_ids: string[] | null
          updated_at: string
          use_in_resume: boolean | null
          user_id: string
          verification_status: string | null
          verified: boolean | null
        }
        Insert: {
          course_url?: string | null
          created_at?: string
          credits?: number | null
          credits_earned?: number | null
          cri_score?: number | null
          description?: string | null
          difficulty?: string | null
          grade?: string | null
          id?: string
          institution_grade?: string | null
          institution_id?: string | null
          skill_tags?: string[] | null
          teacher_id?: string | null
          title: string
          track_ids?: string[] | null
          updated_at?: string
          use_in_resume?: boolean | null
          user_id: string
          verification_status?: string | null
          verified?: boolean | null
        }
        Update: {
          course_url?: string | null
          created_at?: string
          credits?: number | null
          credits_earned?: number | null
          cri_score?: number | null
          description?: string | null
          difficulty?: string | null
          grade?: string | null
          id?: string
          institution_grade?: string | null
          institution_id?: string | null
          skill_tags?: string[] | null
          teacher_id?: string | null
          title?: string
          track_ids?: string[] | null
          updated_at?: string
          use_in_resume?: boolean | null
          user_id?: string
          verification_status?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_evidence: {
        Row: {
          captured_at: string | null
          captured_by: string | null
          evidence_data: Json | null
          evidence_text: string | null
          evidence_type: string
          evidence_url: string | null
          id: string
          policy_pack_id: string | null
          rule_id: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          captured_at?: string | null
          captured_by?: string | null
          evidence_data?: Json | null
          evidence_text?: string | null
          evidence_type: string
          evidence_url?: string | null
          id?: string
          policy_pack_id?: string | null
          rule_id?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          captured_at?: string | null
          captured_by?: string | null
          evidence_data?: Json | null
          evidence_text?: string | null
          evidence_type?: string
          evidence_url?: string | null
          id?: string
          policy_pack_id?: string | null
          rule_id?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_evidence_policy_pack_id_fkey"
            columns: ["policy_pack_id"]
            isOneToOne: false
            referencedRelation: "institution_policy_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_evidence_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "credit_transfer_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_rules: {
        Row: {
          active: boolean | null
          block_id: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
          notes: string | null
          rule_kind: Database["public"]["Enums"]["rule_kind"]
          score: number | null
          to_program_id: string
          transfer_state: string
          value: number
        }
        Insert: {
          active?: boolean | null
          block_id?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          notes?: string | null
          rule_kind: Database["public"]["Enums"]["rule_kind"]
          score?: number | null
          to_program_id: string
          transfer_state?: string
          value: number
        }
        Update: {
          active?: boolean | null
          block_id?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          notes?: string | null
          rule_kind?: Database["public"]["Enums"]["rule_kind"]
          score?: number | null
          to_program_id?: string
          transfer_state?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfer_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_badge_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          metrics_snapshot: Json
          share_token: string
          title: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          metrics_snapshot?: Json
          share_token?: string
          title?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          metrics_snapshot?: Json
          share_token?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      usage_quotas: {
        Row: {
          created_at: string
          maya_analyses_used: number
          month_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          maya_analyses_used?: number
          month_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          maya_analyses_used?: number
          month_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_academic_progress: {
        Row: {
          completed_at: string | null
          course_id: string | null
          created_at: string
          earned_credits: number | null
          equivalency_id: string | null
          evidence_url: string | null
          id: string
          requirement_id: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          earned_credits?: number | null
          equivalency_id?: string | null
          evidence_url?: string | null
          id?: string
          requirement_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          earned_credits?: number | null
          equivalency_id?: string | null
          evidence_url?: string | null
          id?: string
          requirement_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_academic_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_academic_progress_equivalency_id_fkey"
            columns: ["equivalency_id"]
            isOneToOne: false
            referencedRelation: "edu_equivalencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_academic_progress_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "edu_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_type: string
          course_id: string | null
          created_at: string
          goal_id: string | null
          id: string
          metadata: Json | null
          milestone_id: string | null
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          achievement_type: string
          course_id?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          metadata?: Json | null
          milestone_id?: string | null
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          achievement_type?: string
          course_id?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          metadata?: Json | null
          milestone_id?: string | null
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_alt_course_usage: {
        Row: {
          alt_course_id: string
          created_at: string | null
          id: string
          note: string | null
          track_id: string
          user_id: string
        }
        Insert: {
          alt_course_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          track_id: string
          user_id: string
        }
        Update: {
          alt_course_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_alt_course_usage_alt_course_id_fkey"
            columns: ["alt_course_id"]
            isOneToOne: false
            referencedRelation: "alternative_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_alt_course_usage_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_alt_course_usage_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
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
      user_course_events: {
        Row: {
          completion_date: string | null
          course_id: string | null
          created_at: string | null
          event_type: string
          evidence: Json | null
          grade: string | null
          id: string
          notes: string | null
          progress_percent: number | null
          score: number | null
          source: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completion_date?: string | null
          course_id?: string | null
          created_at?: string | null
          event_type: string
          evidence?: Json | null
          grade?: string | null
          id?: string
          notes?: string | null
          progress_percent?: number | null
          score?: number | null
          source?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completion_date?: string | null
          course_id?: string | null
          created_at?: string | null
          event_type?: string
          evidence?: Json | null
          grade?: string | null
          id?: string
          notes?: string | null
          progress_percent?: number | null
          score?: number | null
          source?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_ratings: {
        Row: {
          completion_verified: boolean | null
          course_id: string
          created_at: string | null
          difficulty_rating: number
          helpful_votes: number | null
          id: string
          review_text: string | null
          time_to_complete_hours: number | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
          would_recommend: boolean | null
        }
        Insert: {
          completion_verified?: boolean | null
          course_id: string
          created_at?: string | null
          difficulty_rating: number
          helpful_votes?: number | null
          id?: string
          review_text?: string | null
          time_to_complete_hours?: number | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          completion_verified?: boolean | null
          course_id?: string
          created_at?: string | null
          difficulty_rating?: number
          helpful_votes?: number | null
          id?: string
          review_text?: string | null
          time_to_complete_hours?: number | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
        Relationships: [
          {
            foreignKeyName: "user_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
        ]
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
      user_onboarding_responses: {
        Row: {
          career_goal: string | null
          created_at: string
          id: string
          location: string | null
          target_role: string | null
          user_id: string
        }
        Insert: {
          career_goal?: string | null
          created_at?: string
          id?: string
          location?: string | null
          target_role?: string | null
          user_id: string
        }
        Update: {
          career_goal?: string | null
          created_at?: string
          id?: string
          location?: string | null
          target_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_paths: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_shared: boolean | null
          last_accessed_at: string | null
          share_token: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          last_accessed_at?: string | null
          share_token?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          last_accessed_at?: string | null
          share_token?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_plan_courses: {
        Row: {
          cost_paid: number | null
          course_id: string
          created_at: string | null
          credits_earned: number | null
          grade: string | null
          id: string
          notes: string | null
          plan_id: string
          planned_term: string | null
          provider_id: string
          requirement_id: string | null
          status: Database["public"]["Enums"]["plan_status"] | null
          transfer_source: Database["public"]["Enums"]["transfer_source"] | null
          updated_at: string | null
        }
        Insert: {
          cost_paid?: number | null
          course_id: string
          created_at?: string | null
          credits_earned?: number | null
          grade?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          planned_term?: string | null
          provider_id: string
          requirement_id?: string | null
          status?: Database["public"]["Enums"]["plan_status"] | null
          transfer_source?:
            | Database["public"]["Enums"]["transfer_source"]
            | null
          updated_at?: string | null
        }
        Update: {
          cost_paid?: number | null
          course_id?: string
          created_at?: string | null
          credits_earned?: number | null
          grade?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          planned_term?: string | null
          provider_id?: string
          requirement_id?: string | null
          status?: Database["public"]["Enums"]["plan_status"] | null
          transfer_source?:
            | Database["public"]["Enums"]["transfer_source"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_plan_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plan_courses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plan_courses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plan_courses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "requirement_options_view"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "user_plan_courses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "requirement_options_view_by_block"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "user_plan_courses_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "program_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          program_id: string
          target_graduation: string | null
          track_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          program_id: string
          target_graduation?: string | null
          track_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          program_id?: string
          target_graduation?: string | null
          track_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          completed_steps: string[] | null
          current_phase: string | null
          experience_level: string | null
          has_completed_onboarding: boolean | null
          last_active_date: string | null
          milestones: Json | null
          preferred_features: string[] | null
          updated_at: string | null
          user_goals: string[] | null
          user_id: string
        }
        Insert: {
          completed_steps?: string[] | null
          current_phase?: string | null
          experience_level?: string | null
          has_completed_onboarding?: boolean | null
          last_active_date?: string | null
          milestones?: Json | null
          preferred_features?: string[] | null
          updated_at?: string | null
          user_goals?: string[] | null
          user_id: string
        }
        Update: {
          completed_steps?: string[] | null
          current_phase?: string | null
          experience_level?: string | null
          has_completed_onboarding?: boolean | null
          last_active_date?: string | null
          milestones?: Json | null
          preferred_features?: string[] | null
          updated_at?: string | null
          user_goals?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_transcript_health"
            referencedColumns: ["user_id"]
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
      user_teacher_ratings: {
        Row: {
          completion_status: string | null
          course_id: string | null
          created_at: string
          helpful_votes: number | null
          id: string
          rating: number
          review: string | null
          tags: string[] | null
          teacher_id: string
          updated_at: string
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          completion_status?: string | null
          course_id?: string | null
          created_at?: string
          helpful_votes?: number | null
          id?: string
          rating: number
          review?: string | null
          tags?: string[] | null
          teacher_id: string
          updated_at?: string
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          completion_status?: string | null
          course_id?: string | null
          created_at?: string
          helpful_votes?: number | null
          id?: string
          rating?: number
          review?: string | null
          tags?: string[] | null
          teacher_id?: string
          updated_at?: string
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_teacher_ratings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_track_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_track_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_track_badges_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_track_badges_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      user_track_xp: {
        Row: {
          id: string
          last_updated: string
          total_xp: number
          track_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_updated?: string
          total_xp?: number
          track_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_updated?: string
          total_xp?: number
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_track_xp_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_track_xp_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      user_track_xp_events: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          source: string | null
          track_id: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          source?: string | null
          track_id: string
          user_id: string
          xp: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          source?: string | null
          track_id?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_track_xp_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_track_xp_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      user_tracks: {
        Row: {
          created_at: string | null
          is_primary: boolean | null
          started_at: string | null
          status: string | null
          target_completion_date: string | null
          track_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          is_primary?: boolean | null
          started_at?: string | null
          status?: string | null
          target_completion_date?: string | null
          track_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          is_primary?: boolean | null
          started_at?: string | null
          status?: string | null
          target_completion_date?: string | null
          track_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trust_metrics: {
        Row: {
          created_at: string
          engagement_score: number
          feedback_volume: number
          id: string
          last_calculated_at: string
          metadata: Json
          recommendation_accuracy: number
          satisfaction_score: number
          trend: Json
          trust_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engagement_score?: number
          feedback_volume?: number
          id?: string
          last_calculated_at?: string
          metadata?: Json
          recommendation_accuracy?: number
          satisfaction_score?: number
          trend?: Json
          trust_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engagement_score?: number
          feedback_volume?: number
          id?: string
          last_calculated_at?: string
          metadata?: Json
          recommendation_accuracy?: number
          satisfaction_score?: number
          trend?: Json
          trust_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      workflow_validations: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          is_active: boolean
          source_id: string | null
          source_type: string
          step_id: string | null
          updated_at: string
          user_id: string
          validated_by: string | null
          validation_data: Json
          validation_score: number
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          id?: string
          is_active?: boolean
          source_id?: string | null
          source_type: string
          step_id?: string | null
          updated_at?: string
          user_id: string
          validated_by?: string | null
          validation_data?: Json
          validation_score?: number
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          is_active?: boolean
          source_id?: string | null
          source_type?: string
          step_id?: string | null
          updated_at?: string
          user_id?: string
          validated_by?: string | null
          validation_data?: Json
          validation_score?: number
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
      requirement_option_counts: {
        Row: {
          has_ace_credit: boolean | null
          has_clep: boolean | null
          options_count: number | null
          requirement_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_options_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "program_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_options_view: {
        Row: {
          cost_usd: number | null
          course_id: string | null
          credits: number | null
          cri_score: number | null
          duration_weeks: number | null
          level: number | null
          modality: Database["public"]["Enums"]["modality_type"] | null
          option_kind: Database["public"]["Enums"]["option_kind"] | null
          provider_id: string | null
          provider_name: string | null
          provider_type: Database["public"]["Enums"]["provider_type"] | null
          requirement_id: string | null
          skill_tags: string[] | null
          title: string | null
          transfer_fit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_options_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "program_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_options_view_by_block: {
        Row: {
          block_id: string | null
          cost_usd: number | null
          course_id: string | null
          credits: number | null
          cri_score: number | null
          duration_weeks: number | null
          level: number | null
          modality: Database["public"]["Enums"]["modality_type"] | null
          option_kind: Database["public"]["Enums"]["option_kind"] | null
          provider_id: string | null
          provider_name: string | null
          provider_type: Database["public"]["Enums"]["provider_type"] | null
          requirement_id: string | null
          skill_tags: string[] | null
          title: string | null
          transfer_fit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_options_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "program_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      track_cri_history_v: {
        Row: {
          cri_average: number | null
          readiness_score: number | null
          recorded_at: string | null
          resume_title: string | null
          track_id: string | null
          track_title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_resume_drafts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "career_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_resume_drafts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "user_track_progress_v"
            referencedColumns: ["track_id"]
          },
        ]
      }
      user_track_progress_v: {
        Row: {
          color: string | null
          completion_percentage: number | null
          courses_completed: number | null
          created_at: string | null
          current_cri_score: number | null
          description: string | null
          icon: string | null
          last_activity_at: string | null
          title: string | null
          total_courses: number | null
          track_id: string | null
          updated_at: string | null
          user_id: string | null
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
      v_transcript_health: {
        Row: {
          duplicate_rows: number | null
          total_tags: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      after_maya_analysis_increment_quota: { Args: never; Returns: undefined }
      award_xp: {
        Args: {
          action_type_param: string
          reason_param: string
          source_id_param?: string
          user_id_param: string
          xp_amount_param: number
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
          career_path_id: string
          completed: boolean
          created_at: string
          description: string
          estimated_duration: string
          id: string
          is_terminal: boolean
          level: number
          prerequisites: string[]
          step_order: number
          title: string
          updated_at: string
        }[]
      }
      calculate_confidence_score: { Args: { breakdown: Json }; Returns: number }
      calculate_mentor_performance_metrics: {
        Args: { end_date: string; mentor_user_id: string; start_date: string }
        Returns: {
          approval_rate: number
          avg_review_time_hours: number
          courses_approved: number
          courses_rejected: number
          courses_reviewed: number
          impact_score: number
          quality_score: number
        }[]
      }
      calculate_profile_completeness: {
        Args: { profile_row: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: number
      }
      calculate_system_health_score: { Args: never; Returns: number }
      calculate_user_trust_metrics: {
        Args: { days_back?: number; user_id_param: string }
        Returns: Json
      }
      calculate_xp_multiplier: {
        Args: {
          action_type_param: string
          difficulty_level?: number
          engagement_score?: number
          user_id_param: string
        }
        Returns: number
      }
      capture_phase6_baseline: {
        Args: { target_user_id: string }
        Returns: string
      }
      check_mentor_achievements: {
        Args: { mentor_user_id: string }
        Returns: undefined
      }
      clone_career_track: {
        Args: {
          new_color?: string
          new_icon?: string
          new_track_name: string
          source_track_id: string
        }
        Returns: string
      }
      complete_course_progress: {
        Args: {
          completion_notes_param?: string
          course_id_param: string
          user_id_param: string
        }
        Returns: string
      }
      create_celebration_moment: {
        Args: {
          celebration_data_param: Json
          celebration_type_param: string
          trigger_data_param: Json
          user_id_param: string
        }
        Returns: string
      }
      dev_user_session_end: {
        Args: {
          dev_user_id: string
          session_id_param: string
          session_metrics?: Json
        }
        Returns: string
      }
      dev_user_session_start: {
        Args: {
          course_id_param: string
          dev_user_id: string
          session_type_param?: string
        }
        Returns: string
      }
      dev_user_submit_maya_feedback: {
        Args: {
          dev_user_id: string
          feedback_data_param: Json
          feedback_type_param: string
          user_rating_param?: number
        }
        Returns: string
      }
      generate_autonomous_intervention: {
        Args: { risk_assessment: Json; target_user_id: string }
        Returns: string
      }
      generate_certificate_number: { Args: never; Returns: string }
      generate_phase6_enterprise_certification: {
        Args: {
          baseline_snapshot_id: string
          component_lock_ids: string[]
          target_user_id: string
        }
        Returns: string
      }
      generate_user_roadmap: { Args: { user_id_param: string }; Returns: Json }
      generate_verification_code: { Args: never; Returns: string }
      get_age_penalty: { Args: { age_int: number }; Returns: number }
      get_badge_for_user: {
        Args: { badge_slug: string; user_uuid?: string }
        Returns: {
          description: string
          earned_at: string
          emoji: string
          id: string
          name: string
          slug: string
          threshold: number
          trigger_type: string
          user_has_earned: boolean
        }[]
      }
      get_badge_statistics: {
        Args: never
        Returns: {
          badge_emoji: string
          badge_id: string
          badge_name: string
          earned_count: number
        }[]
      }
      get_confidence_action: { Args: { score: number }; Returns: string }
      get_demo_resume_profiles: {
        Args: never
        Returns: {
          created_at: string
          current_level: number
          earned_badges: Json
          email: string
          name: string
          resume_id: string
          slug: string
          total_xp: number
          user_id: string
        }[]
      }
      get_maya_visible_insights: {
        Args: { target_user_id?: string }
        Returns: {
          acted_upon_at: string
          category: string
          confidence_score: number
          content: string
          context_data: Json
          created_at: string
          dismissed_at: string
          expires_at: string
          feedback_rating: number
          id: string
          insight_type: string
          priority: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_mentor_by_user_id: { Args: { user_uuid: string }; Returns: boolean }
      get_track_insights: { Args: { p_track_id: string }; Returns: Json }
      get_transcript_health: {
        Args: never
        Returns: {
          duplicate_rows: number
          total_tags: number
        }[]
      }
      get_user_level: {
        Args: { user_id_param: string }
        Returns: {
          current_level: number
          total_xp: number
          user_id: string
          xp_for_current_level: number
          xp_for_next_level: number
          xp_progress_in_level: number
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_validation_metrics: {
        Args: { target_user_id?: string }
        Returns: {
          avg_confidence_score: number
          avg_validation_score: number
          cri_validations: number
          high_score_validations: number
          last_validation_at: string
          maya_validations: number
          mentor_validations: number
          peer_validations: number
          total_validations: number
          user_id: string
          validation_breakdown: Json
        }[]
      }
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["app_role"]
          user_uuid: string
        }
        Returns: boolean
      }
      is_mentor: { Args: never; Returns: boolean }
      lock_phase6_components: {
        Args: { baseline_snapshot_id: string; target_user_id: string }
        Returns: string[]
      }
      predict_engagement_decline: {
        Args: { target_user_id: string }
        Returns: Json
      }
      recompute_track_metrics: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: undefined
      }
      record_referral_event: {
        Args: { p_code: string; p_ip: unknown; p_type: string; p_ua: string }
        Returns: undefined
      }
      refresh_career_steps_with_levels: { Args: never; Returns: undefined }
      refresh_requirement_option_counts: { Args: never; Returns: undefined }
      slugify: { Args: { input: string }; Returns: string }
      start_course_progress: {
        Args: { course_id_param: string; user_id_param: string }
        Returns: string
      }
      suggest_badges_for_user: {
        Args: { user_uuid: string }
        Returns: {
          badge_id: string
          emoji: string
          name: string
          reason: string
          slug: string
        }[]
      }
      system_health_check: { Args: never; Returns: Json }
      update_learning_streak: {
        Args: { activity_date?: string; user_id_param: string }
        Returns: Json
      }
      update_maya_feedback_model: {
        Args: { target_user_id: string }
        Returns: Json
      }
      upsert_user_trust_metrics: {
        Args: { days_back?: number; user_id_param: string }
        Returns: string
      }
      validate_mentor_operation: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      validate_no_public_extensions: { Args: never; Returns: undefined }
    }
    Enums: {
      alt_course_provider:
        | "youtube"
        | "udemy"
        | "coursera"
        | "edx"
        | "masterclass"
        | "other"
      app_role: "user" | "admin" | "mentor"
      course_level_enum:
        | "introductory"
        | "intermediate"
        | "advanced"
        | "graduate"
      delivery_mode_enum:
        | "asynchronous"
        | "synchronous"
        | "hybrid"
        | "testing_center"
      modality_type: "online" | "in_person" | "hybrid"
      option_kind: "course" | "exam" | "cert"
      plan_status: "planned" | "enrolled" | "complete" | "dropped"
      provider_type: "university" | "mooc" | "bootcamp" | "testing_center"
      rule_kind:
        | "residency_min"
        | "transfer_max"
        | "upper_division_min"
        | "provider_blacklist"
        | "time_limit"
      transfer_source: "ACE" | "NCCRS" | "CLEP" | "XFER" | "HOME" | "DSST"
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
      alt_course_provider: [
        "youtube",
        "udemy",
        "coursera",
        "edx",
        "masterclass",
        "other",
      ],
      app_role: ["user", "admin", "mentor"],
      course_level_enum: [
        "introductory",
        "intermediate",
        "advanced",
        "graduate",
      ],
      delivery_mode_enum: [
        "asynchronous",
        "synchronous",
        "hybrid",
        "testing_center",
      ],
      modality_type: ["online", "in_person", "hybrid"],
      option_kind: ["course", "exam", "cert"],
      plan_status: ["planned", "enrolled", "complete", "dropped"],
      provider_type: ["university", "mooc", "bootcamp", "testing_center"],
      rule_kind: [
        "residency_min",
        "transfer_max",
        "upper_division_min",
        "provider_blacklist",
        "time_limit",
      ],
      transfer_source: ["ACE", "NCCRS", "CLEP", "XFER", "HOME", "DSST"],
    },
  },
} as const
